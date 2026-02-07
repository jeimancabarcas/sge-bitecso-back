
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Voter } from './voter.entity';

@Entity()
export class VoterDetail {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    department: string;

    @Column()
    municipality: string;

    @Column()
    polling_station: string;

    @Column()
    table: string;

    @Column({ nullable: true })
    address: string;

    @OneToOne(() => Voter, (voter) => voter.detail, { onDelete: 'CASCADE' })
    @JoinColumn()
    voter: Voter;
}
