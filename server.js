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
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { username, },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    if (!hashedPassword) {
      return res.status(501).json({ error: 'Error hashing password.' });
    }

    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    console.log('User registered successfully:', username);

    return res.status(201).json({ message: 'User registered successfully.' });
  } 
  catch (error) {
    console.log('Error during registration:', error);
    return res.status(500).json({ error: 'Internal server error!!!' });
  }
});


//LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

 try {
  const user = await prisma.user.findUnique({
    where: 
    {username,},
  });

  if (!user) {
      return res.status(401).json({ error: 'Invalid username' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
  }

  const SECRET='12345SECRETIVE'; 
  const token = jwt.sign({ username: user.username }, SECRET, { expiresIn: '1h' });

  return res.status(200).json({ message: 'Login successful'});
  
}
  catch(error){
      return res.status(500).json({ error: 'INVALID CREDENTIALS' });
  }
  
});


//HOME PAGE
const jwt = require('jsonwebtoken');
app.get('/api/home', async(req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized_1' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secretKey);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized_2' });
    }

    jwt.verify(token, '12345SECRETIVE', (err, decoded) => {
      if (err) {
        console.log('Token is invalid');
      } else {
        console.log('Decoded Token:', decoded);
      }
    });

    res.status(200).json({ message: `Welcome, ${user.username}` });
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized_3' });
  }
  });


app.listen(PORT, () => {
  console.log(`Go To http://localhost:${PORT}`);
});