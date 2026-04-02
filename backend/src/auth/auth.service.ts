import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from './interfaces/user.interface';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  // In-memory user store (replace with database in production)
  private users: User[] = [];

  constructor(private readonly jwtService: JwtService) {}

  async register(registerDto: RegisterDto): Promise<{ user: Omit<User, 'password'>; access_token: string }> {
    // Check if user already exists
    const existingUser = this.users.find(u => u.email.toLowerCase() === registerDto.email.toLowerCase());
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create new user
    const newUser: User = {
      id: randomUUID(),
      email: registerDto.email.toLowerCase(),
      password: hashedPassword,
      fullName: registerDto.fullName,
      role: registerDto.role,
      university: registerDto.university,
      region: registerDto.region,
      specialty: registerDto.specialty,
      verified: registerDto.role === 'student', // Students auto-verified, teachers need verification
      createdAt: new Date(),
    };

    this.users.push(newUser);

    // Generate JWT
    const payload = { sub: newUser.id, email: newUser.email, role: newUser.role };
    const access_token = this.jwtService.sign(payload);

    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return { user: userWithoutPassword, access_token };
  }

  async login(loginDto: LoginDto): Promise<{ user: Omit<User, 'password'>; access_token: string }> {
    // Find user by email
    const user = this.users.find(u => u.email.toLowerCase() === loginDto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, access_token };
  }

  async validateUser(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = this.users.find(u => u.id === userId);
    if (!user) return null;
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
}
