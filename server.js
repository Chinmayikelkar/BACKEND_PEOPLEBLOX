import express from 'express';
const bcrypt = require('bcrypt');
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient();
const app = express();
const PORT = 4000;
const SALT_ROUNDS = 10;

app.use(express.json());


//REGISTRATION
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
 
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required!' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username, },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists!' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    if (!hashedPassword) {
      return res.status(501).json({ error: 'Error hashing password!' });
    }

    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    console.log('User registered successfully:', username);

    return res.status(201).json({ message: 'User registered successfully!' });
  } 
  catch (error) {
    console.log('Error during registration:', error);
    return res.status(500).json({ error: 'Internal server error!!!' });
  }
});


//LOGIN
import jwt from 'jsonwebtoken';
const SECRET = '12345SECRETIVE';

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required!!' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username' });
    }

    const now = new Date();
   
    if (user.lockUntil && user.lockUntil > now) {
      return res.status(403).json({ error: `Account locked! Try again after ${user.lockUntil}` });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      let failedAttempts = user.failedAttempts || 0;
      let lastFailedAt = user.lastFailedAt;
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      // Resetting if last failure is too old
      if (!lastFailedAt || lastFailedAt < twelveHoursAgo) {
        failedAttempts = 1; 
      } else {
        failedAttempts++;
      }

      let updateData = {
        failedAttempts,
        lastFailedAt: now,
      };

      if (failedAttempts >= 5) {
        updateData.lockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
      }

      await prisma.user.update({
        where: { username },
        data: updateData,
      });

      return res.status(401).json({ error: 'Invalid password!' });
    }

    // Resetting failed attempts (after Successfull login)
    await prisma.user.update({
      where: { username },
      data: {
        failedAttempts: 0,
        lastFailedAt: null,
        lockUntil: null,
      },
    });

    const token = jwt.sign({ userId: user.id, username: user.username }, SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error!!!' });
  }
});



//HOME PAGE
app.get('/api/home', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.status(200).json({ message: `Welcome, ${user.username}` });
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized - Invalid Token!' });
  }
});

  

app.listen(PORT, () => {
  console.log(`Go To http://localhost:${PORT}`);
});