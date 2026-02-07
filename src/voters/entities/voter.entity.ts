
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { VerificationLog } from './verification-log.entity';

@Entity()
export class Voter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    cedula: string;

    @Column({ nullable: true })
    nombre: string;

    @Column({ nullable: true })
    telefono: string;

    @Column({ nullable: true })
    nombre_lider: string;

    @Column({ default: false })
    is_verified: boolean;

    @Column({ type: 'jsonb', nullable: true })
    registraduria_data: any;

    @OneToMany(() => VerificationLog, (log) => log.voter)
    verification_logs: VerificationLog[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
