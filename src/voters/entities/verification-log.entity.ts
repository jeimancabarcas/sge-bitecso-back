
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Voter } from './voter.entity';

@Entity()
export class VerificationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    status: string; // SUCCESS, FAILED, ERROR

    @Column({ nullable: true })
    message: string;

    @ManyToOne(() => Voter, (voter) => voter.verification_logs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'voter_id' })
    voter: Voter;

    @CreateDateColumn()
    attempted_at: Date;
}
