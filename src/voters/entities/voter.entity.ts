
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { VerificationLog } from './verification-log.entity';
import { Leader } from '../../leaders/entities/leader.entity';

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
    leader_id: string;

    @ManyToOne(() => Leader, (leader) => leader.voters)
    @JoinColumn({ name: 'leader_id' })
    leader: Leader;

    @Column({ default: 'PENDING' })
    verification_status: string; // PENDING, SUCCESS, FAILED

    @Column({ type: 'jsonb', nullable: true })
    registraduria_data: any;

    @OneToMany(() => VerificationLog, (log) => log.voter)
    verification_logs: VerificationLog[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
