
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(username: string, pass: string, fullName: string | undefined = '', role: UserRole = UserRole.DIGITADOR): Promise<User> {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(pass, salt);

        const user = this.userRepository.create({
            username,
            fullName,
            password: hashedPassword,
            role,
        });

        return this.userRepository.save(user);
    }

    async findOne(username: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { username },
            select: ['id', 'username', 'password', 'role', 'fullName']
        });
    }

    async findAllByRole(role: UserRole): Promise<User[]> {
        return this.userRepository.find({
            where: { role },
            select: ['id', 'username', 'fullName', 'role', 'created_at', 'updated_at']
        });
    }

    async findAll(): Promise<User[]> {
        return this.userRepository.find({
            select: ['id', 'username', 'fullName', 'role', 'created_at', 'updated_at']
        });
    }

    async findOneById(id: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id },
            select: ['id', 'username', 'fullName', 'role', 'created_at', 'updated_at']
        });
    }

    async update(id: string, updateUserDto: any): Promise<User | null> {
        if (updateUserDto.password) {
            const salt = await bcrypt.genSalt();
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
        }
        await this.userRepository.update(id, updateUserDto);
        return this.findOneById(id);
    }

    async remove(id: string): Promise<void> {
        await this.userRepository.delete(id);
    }
}
