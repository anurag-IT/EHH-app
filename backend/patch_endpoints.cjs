const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

const endpoints = `

app.get("/api/notifications", checkUserRestriction, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.currentUser.id },
      include: { 
        sender: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/posts/:id/comments", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const comments = await prisma.comment.findMany({
      where: { postId },
      include: { 
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: "asc" }
    });
    res.json(comments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/users/suggested", checkUserRestriction, async (req, res) => {
  try {
    const userId = req.currentUser.id;
    const following = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });
    const excludeIds = following.map(f => f.followingId).concat(userId);
    const suggested = await prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      take: 10,
      select: { id: true, name: true, avatar: true, uniqueId: true }
    });
    res.json(suggested);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/users/:id/stats", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const [postsCount, followersCount, followingCount] = await Promise.all([
      prisma.post.count({ where: { userId } }),
      prisma.userFollow.count({ where: { followingId: userId, status: "ACCEPTED" } }),
      prisma.userFollow.count({ where: { followerId: userId, status: "ACCEPTED" } })
    ]);
    res.json({ postsCount, followersCount, followingCount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/users/:id/profile", checkUserRestriction, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const currentUserId = req.currentUser.id;
    
    const userProfile = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        name: true,
        avatar: true,
        uniqueId: true,
        bio: true,
        isPrivate: true,
        _count: {
          select: {
            posts: true,
            followers: { where: { status: "ACCEPTED" } },
            following: { where: { status: "ACCEPTED" } }
          }
        }
      }
    });

    if (!userProfile) return res.status(404).json({ error: "User not found" });

    const followRecord = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: targetId } }
    });

    res.json({
      ...userProfile,
      followStatus: followRecord ? followRecord.status : "NONE",
      postsCount: userProfile._count.posts,
      followersCount: userProfile._count.followers,
      followingCount: userProfile._count.following
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
`;

if (!c.includes('/api/notifications')) {
  c += endpoints;
  fs.writeFileSync('server.ts', c);
  console.log('Backend endpoints updated.');
} else {
  console.log('Endpoints already present.');
}
