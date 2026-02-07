import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

describe('AuthService', () => {
    let service: AuthService;
    let configService: ConfigService;

    const mockPrismaService = {
        staff: {
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        tenant: {
            create: jest.fn(),
            findUnique: jest.fn(),
        },
        $queryRaw: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should use configured JWT secret', async () => {
        mockConfigService.get.mockImplementation((key) => {
            if (key === 'JWT_SECRET') return 'super-secure-secret';
            if (key === 'NODE_ENV') return 'production';
            return null;
        });

        mockPrismaService.$queryRaw.mockResolvedValue([
             { id: 'u1', email: 'test@test.com', tenantId: 't1', password: 'hashedpassword' }
        ]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 't1', features: '{}' });
        mockPrismaService.staff.update.mockResolvedValue({});

        const result = await service.login({ email: 'test@test.com', password: 'password' });

        expect(result.token).toBeDefined();
        expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedpassword');
    });

    it('should throw error in production if JWT_SECRET is missing', async () => {
        mockConfigService.get.mockImplementation((key) => {
            if (key === 'JWT_SECRET') return undefined;
            if (key === 'NODE_ENV') return 'production';
            return null;
        });

        mockPrismaService.$queryRaw.mockResolvedValue([
             { id: 'u1', email: 'test@test.com', tenantId: 't1', password: 'hashedpassword' }
        ]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await expect(service.login({ email: 'test@test.com', password: 'password' }))
            .rejects
            .toThrow('CRITICAL SECURITY ERROR: JWT_SECRET is not defined');
    });

    it('should use default secret in non-production if JWT_SECRET is missing', async () => {
        mockConfigService.get.mockImplementation((key) => {
            if (key === 'JWT_SECRET') return undefined;
            if (key === 'NODE_ENV') return 'development';
            return null;
        });

        mockPrismaService.$queryRaw.mockResolvedValue([
             { id: 'u1', email: 'test@test.com', tenantId: 't1', password: 'hashedpassword' }
        ]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 't1', features: '{}' });
        mockPrismaService.staff.update.mockResolvedValue({});

        const result = await service.login({ email: 'test@test.com', password: 'password' });
        expect(result.token).toBeDefined();
    });

    it('should fail login if password does not match', async () => {
        mockPrismaService.$queryRaw.mockResolvedValue([
             { id: 'u1', email: 'test@test.com', tenantId: 't1', password: 'hashedpassword' }
        ]);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(service.login({ email: 'test@test.com', password: 'wrongpassword' }))
            .rejects
            .toThrow('Invalid credentials');
    });

    it('should fail login if user has no password setup', async () => {
        mockPrismaService.$queryRaw.mockResolvedValue([
             { id: 'u1', email: 'test@test.com', tenantId: 't1', password: null }
        ]);

        await expect(service.login({ email: 'test@test.com', password: 'password' }))
            .rejects
            .toThrow('Account requires password setup');
    });

    it('should hash password on register', async () => {
        mockPrismaService.$queryRaw.mockResolvedValue([]);
        mockPrismaService.tenant.create.mockResolvedValue({ features: '{}' });
        mockPrismaService.staff.create.mockResolvedValue({ id: 'u1', email: 'new@test.com' });
        (bcrypt.hash as jest.Mock).mockResolvedValue('newhashedpassword');
        mockConfigService.get.mockReturnValue('secret');

        await service.register({ email: 'new@test.com', orgName: 'Test Org', password: 'newpassword' });

        expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
        expect(mockPrismaService.staff.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                password: 'newhashedpassword'
            })
        }));
    });
});
