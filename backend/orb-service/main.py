import cv2
import numpy as np
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

# Concurrency limit: Only allow 2 intensive matching operations at a time
# This prevents CPU saturation on smaller machines
matching_semaphore = asyncio.Semaphore(2)
# Executor for running synchronous OpenCV tasks in a separate thread
executor = ThreadPoolExecutor(max_workers=4)

class CompareRequest(BaseModel):
    image1: str
    image2: str

class CompareResponse(BaseModel):
    matchScore: float
    confidence: str
    goodMatches: int
    totalKeypoints: int
    status: str
    error: Optional[str] = None

def download_image(url: str):
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        arr = np.asarray(bytearray(resp.content), dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("Could not decode image")
        return img
    except Exception as e:
        raise ValueError(f"Failed to download image from {url}: {str(e)}")

def orb_compare(img1, img2):
    # Initialize ORB detector
    orb = cv2.ORB_create(nfeatures=1000)
    
    # find the keypoints and descriptors with ORB
    kp1, des1 = orb.detectAndCompute(img1, None)
    kp2, des2 = orb.detectAndCompute(img2, None)
    
    if des1 is None or des2 is None:
        return 0, 0, len(kp1) + len(kp2)

    # create BFMatcher object
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    # Match descriptors
    matches = bf.match(des1, des2)

    # Sort them in the order of their distance
    matches = sorted(matches, key = lambda x:x.distance)
    
    # Filter good matches based on distance threshold
    # For ORB/Hamming, a distance under 30-50 is usually quite good
    good_matches = [m for m in matches if m.distance < 45]
    
    total_kp = max(len(kp1), len(kp2), 1)
    score = len(good_matches) / total_kp if total_kp > 0 else 0
    
    return score, len(good_matches), total_kp

@app.post("/compare", response_model=CompareResponse)
async def compare_images(request: CompareRequest):
    async with matching_semaphore:
        try:
            # Run blocking I/O and CV tasks in executor
            loop = asyncio.get_event_loop()
            
            # 1. Download images
            try:
                img1 = await loop.run_in_executor(executor, download_image, request.image1)
                img2 = await loop.run_in_executor(executor, download_image, request.image2)
            except ValueError as e:
                return CompareResponse(
                    matchScore=0, confidence="NONE", goodMatches=0, totalKeypoints=0, 
                    status="FAILED", error=str(e)
                )

            # 2. Run ORB comparison
            score, good_cnt, total_kp = await loop.run_in_executor(executor, orb_compare, img1, img2)
            
            # 3. Determine confidence
            confidence = "LOW"
            if score > 0.4: confidence = "MEDIUM"
            if score > 0.7: confidence = "HIGH"
            
            return CompareResponse(
                matchScore=score,
                confidence=confidence,
                goodMatches=good_cnt,
                totalKeypoints=total_kp,
                status="OK"
            )
            
        except Exception as e:
            return CompareResponse(
                matchScore=0, confidence="NONE", goodMatches=0, totalKeypoints=0, 
                status="FAILED", error=str(e)
            )

class DescriptorRequest(BaseModel):
    image_url: str

class DescriptorResponse(BaseModel):
    descriptors: Optional[str] = None
    shape: Optional[list] = None
    status: str
    error: Optional[str] = None

class MatchDescriptorsRequest(BaseModel):
    des1: str
    shape1: list
    des2: str
    shape2: list

@app.post("/descriptors", response_model=DescriptorResponse)
async def get_descriptors(request: DescriptorRequest):
    try:
        loop = asyncio.get_event_loop()
        img = await loop.run_in_executor(executor, download_image, request.image_url)
        orb = cv2.ORB_create(nfeatures=1000)
        kp, des = orb.detectAndCompute(img, None)
        if des is None:
            return DescriptorResponse(descriptors=None, shape=None, status="OK")
        
        import base64
        des_bytes = des.tobytes()
        des_b64 = base64.b64encode(des_bytes).decode('utf-8')
        return DescriptorResponse(descriptors=des_b64, shape=list(des.shape), status="OK")
    except Exception as e:
        return DescriptorResponse(descriptors=None, shape=None, status="FAILED", error=str(e))

@app.post("/match-descriptors", response_model=CompareResponse)
async def match_descriptors(request: MatchDescriptorsRequest):
    try:
        import base64
        if not request.des1 or not request.des2:
            return CompareResponse(matchScore=0, confidence="NONE", goodMatches=0, totalKeypoints=0, status="EMPTY_DESCRIPTORS")

        # Decode descriptors
        des1_bytes = base64.b64decode(request.des1)
        des1 = np.frombuffer(des1_bytes, dtype=np.uint8).reshape(request.shape1)
        
        des2_bytes = base64.b64decode(request.des2)
        des2 = np.frombuffer(des2_bytes, dtype=np.uint8).reshape(request.shape2)
        
        # create BFMatcher object
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

        # Match descriptors
        matches = bf.match(des1, des2)
        matches = sorted(matches, key = lambda x:x.distance)
        good_matches = [m for m in matches if m.distance < 45]
        
        total_kp = max(len(des1), len(des2), 1)
        score = len(good_matches) / total_kp if total_kp > 0 else 0
        
        confidence = "LOW"
        if score > 0.4: confidence = "MEDIUM"
        if score > 0.7: confidence = "HIGH"
        
        return CompareResponse(
            matchScore=score,
            confidence=confidence,
            goodMatches=len(good_matches),
            totalKeypoints=total_kp,
            status="OK"
        )
    except Exception as e:
        return CompareResponse(
            matchScore=0, confidence="NONE", goodMatches=0, totalKeypoints=0, 
            status="FAILED", error=str(e)
        )

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ORB-Feature-Matcher"}

@app.get("/")
def root_check():
    return {"status": "healthy", "message": "ORB Service is running. Use /health for monitoring."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
