
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

    async create(username: string, pass: string, role: UserRole = UserRole.DIGITADOR): Promise<User> {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(pass, salt);

        const user = this.userRepository.create({
            username,
            password: hashedPassword,
            role,
        });

        return this.userRepository.save(user);
    }

    async findOne(username: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { username } });
    }
}
