import { Injectable, ConflictException, UnauthorizedException, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './interfaces/user.interface';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { UserEntity } from './entities/user.entity';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  async seedAdmin(): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
    const teacherEmail = this.configService.get<string>('TEACHER_EMAIL');
    const teacherPassword = this.configService.get<string>('TEACHER_PASSWORD');

    // Seed admin account
    if (!adminEmail || !adminPassword) {
      this.logger.warn('ADMIN_EMAIL or ADMIN_PASSWORD not set – skipping admin seed');
    } else {
      const existingAdmin = await this.userRepository.findOne({ where: { email: adminEmail.toLowerCase() } });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const admin = this.userRepository.create({
          email: adminEmail.toLowerCase(),
          password: hashedPassword,
          fullName: 'Administrator',
          role: 'admin',
          verified: true,
          verificationStatus: 'verified',
        });
        await this.userRepository.save(admin);
        this.logger.log(`Admin account created: ${adminEmail}`);
      } else {
        this.logger.log('Admin account already exists');
      }
    }

    // Seed teacher account
    if (!teacherEmail || !teacherPassword) {
      this.logger.warn('TEACHER_EMAIL or TEACHER_PASSWORD not set – skipping teacher seed');
    } else {
      const existingTeacher = await this.userRepository.findOne({ where: { email: teacherEmail.toLowerCase() } });
      if (!existingTeacher) {
        const hashedPassword = await bcrypt.hash(teacherPassword, 10);
        const teacher = this.userRepository.create({
          email: teacherEmail.toLowerCase(),
          password: hashedPassword,
          fullName: 'Dr. Sarah Khalil',
          role: 'teacher',
          university: 'Faculty of Medicine, Tunis',
          region: 'Tunis',
          specialty: 'Cardiology',
          verified: true,
          verificationStatus: 'verified',
        });
        await this.userRepository.save(teacher);
        this.logger.log(`Teacher account created: ${teacherEmail}`);
      } else {
        this.logger.log('Teacher account already exists');
      }
    }
  }

  async getUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepository.find();
    return users.map(({ password, ...u }) => u as any);
  }

  async register(registerDto: RegisterDto): Promise<{ user: Omit<User, 'password'>; access_token: string }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ 
      where: { email: registerDto.email.toLowerCase() } 
    });
    
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // Create new user
    const newUser = this.userRepository.create({
      email: registerDto.email.toLowerCase(),
      password: hashedPassword,
      fullName: registerDto.fullName,
      role: registerDto.role,
      university: registerDto.university,
      region: registerDto.region,
      specialty: registerDto.specialty,
      verified: registerDto.role === 'student', // Students auto-verified, teachers need verification
      verificationStatus: registerDto.role === 'student' ? 'verified' : 'unverified',
    });

    const savedUser = await this.userRepository.save(newUser);

    // Send welcome notification
    try {
      await this.userNotificationsService.notifyAccountCreated(
        savedUser.id,
        savedUser.fullName
      );
    } catch (error) {
      this.logger.warn(`Failed to send account creation notification: ${error.message}`);
    }

    // Notify admins about new user registration
    try {
      await this.userNotificationsService.notifyNewUserRegistration(
        savedUser.fullName,
        savedUser.role,
        savedUser.id
      );
    } catch (error) {
      this.logger.warn(`Failed to send admin registration notification: ${error.message}`);
    }

    // Generate JWT
    const payload = { sub: savedUser.id, email: savedUser.email, role: savedUser.role };
    const access_token = this.jwtService.sign(payload);

    // Return user without password
    const { password, ...userWithoutPassword } = savedUser;
    return { user: userWithoutPassword as any, access_token };
  }

  async login(loginDto: LoginDto): Promise<{ user: Omit<User, 'password'>; access_token: string }> {
    // Find user by email
    const user = await this.userRepository.findOne({ 
      where: { email: loginDto.email.toLowerCase() } 
    });
    
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
    return { user: userWithoutPassword as any, access_token };
  }

  async validateUser(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return null;
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    await this.userRepository.save(user);

    this.logger.log(`Password changed for user: ${user.email}`);

    // Send password changed notification
    try {
      await this.userNotificationsService.notifyPasswordChanged(user.id);
    } catch (error) {
      this.logger.warn(`Failed to send password change notification: ${error.message}`);
    }
  }
}
