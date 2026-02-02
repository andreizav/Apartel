import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/prisma.service';
import { ConfigService } from '@nestjs/config';

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

        mockPrismaService.staff.findMany.mockResolvedValue([
             { id: 'u1', email: 'test@test.com', tenantId: 't1' }
        ]);
        mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 't1', features: '{}' });
        mockPrismaService.staff.update.mockResolvedValue({});

        const result = await service.login({ email: 'test@test.com' });

        expect(result.token).toBeDefined();
    });

    it('should throw error in production if JWT_SECRET is missing', async () => {
        mockConfigService.get.mockImplementation((key) => {
            if (key === 'JWT_SECRET') return undefined;
            if (key === 'NODE_ENV') return 'production';
            return null;
        });

        mockPrismaService.staff.findMany.mockResolvedValue([
             { id: 'u1', email: 'test@test.com', tenantId: 't1' }
        ]);

        await expect(service.login({ email: 'test@test.com' }))
            .rejects
            .toThrow('CRITICAL SECURITY ERROR: JWT_SECRET is not defined');
    });

    it('should use default secret in non-production if JWT_SECRET is missing', async () => {
        mockConfigService.get.mockImplementation((key) => {
            if (key === 'JWT_SECRET') return undefined;
            if (key === 'NODE_ENV') return 'development';
            return null;
        });

        mockPrismaService.staff.findMany.mockResolvedValue([
             { id: 'u1', email: 'test@test.com', tenantId: 't1' }
        ]);
        mockPrismaService.tenant.findUnique.mockResolvedValue({ id: 't1', features: '{}' });
        mockPrismaService.staff.update.mockResolvedValue({});

        const result = await service.login({ email: 'test@test.com' });
        expect(result.token).toBeDefined();
    });
});
