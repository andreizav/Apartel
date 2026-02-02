import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as jwt from 'jsonwebtoken';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {}

    private getJwtSecret(): string {
        const secret = this.configService.get<string>('JWT_SECRET');
        const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

        if (!secret) {
            if (isProduction) {
                throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET is not defined in environment variables.');
            }
            console.warn('SECURITY WARNING: Using insecure default JWT secret. Do not use this in production!');
            return 'dev-secret-change-in-production';
        }
        return secret;
    }

    private createToken(user: any) {
        return jwt.sign(
            { userId: user.id, tenantId: user.tenantId, email: user.email },
            this.getJwtSecret(),
            { expiresIn: '7d' }
        );
    }

    async login(loginDto: LoginDto) {
        const { email } = loginDto;
        // SQLite doesn't support mode:'insensitive', so we compare with lowercase email
        const allStaff = await this.prisma.staff.findMany();
        const user = allStaff.find(s => s.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const token = this.createToken(user);
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: user.tenantId }
        });

        // Update last active
        await this.prisma.staff.update({
            where: { id: user.id },
            data: { lastActive: new Date(), online: true }
        });

        // Parse tenant features for response
        const tenantWithFeatures = tenant ? {
            ...tenant,
            features: tenant.features ? JSON.parse(tenant.features) : {}
        } : null;

        return {
            success: true,
            token,
            user: { ...user },
            tenant: tenantWithFeatures
        };
    }

    async register(registerDto: RegisterDto) {
        const { email, orgName } = registerDto;

        // SQLite doesn't support mode:'insensitive'
        const allStaff = await this.prisma.staff.findMany();
        const existing = allStaff.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const tenantId = `t-${Date.now()}`;
        const tenant = await this.prisma.tenant.create({
            data: {
                id: tenantId,
                name: String(orgName),
                plan: 'Free',
                status: 'Active',
                maxUnits: 1,
                features: JSON.stringify({ staffBot: false, multiCalendar: true, reports: false }),
            }
        });

        const userId = `u-${Date.now()}`;
        const user = await this.prisma.staff.create({
            data: {
                id: userId,
                tenantId,
                name: String(email).split('@')[0],
                role: 'Manager',
                email: String(email),
                phone: '',
                avatar: `https://picsum.photos/seed/${userId}/100/100`,
                status: 'Active',
                unreadCount: 0,
                online: true,
                lastActive: new Date(),
            }
        });

        const token = this.createToken(user);

        return {
            success: true,
            token,
            user,
            tenant: {
                ...tenant,
                features: JSON.parse(tenant.features || '{}')
            }
        };
    }

    async logout(userId: string) {
        try {
            await this.prisma.staff.update({
                where: { id: userId },
                data: { online: false }
            });
        } catch (e) {
            // User may not exist
        }
        return { success: true };
    }
}
