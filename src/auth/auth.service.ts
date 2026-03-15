import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { office: true } });
    if (!user || !await bcrypt.compare(password, user.password)) throw new UnauthorizedException('Invalid credentials');
    const token = jwt.sign({ userId: user.id, role: user.role, officeId: user.officeId }, process.env.JWT_SECRET || 'clear-dev-secret', { expiresIn: '24h' });
    const { password: _, ...userData } = user;
    return { token, user: userData };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { office: true } });
    if (!user) throw new UnauthorizedException();
    const { password: _, ...userData } = user;
    return userData;
  }
}
