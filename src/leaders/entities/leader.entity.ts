
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Voter } from '../../voters/entities/voter.entity';
import { Chief } from '../../chiefs/entities/chief.entity';

@Entity()
export class Leader {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    nombre: string;

    @Column({ unique: true })
    cedula: string;

    @Column({ nullable: true })
    telefono: string;

    @ManyToOne(() => Chief, (chief) => chief.leaders, { nullable: true })
    @JoinColumn({ name: 'chief_id' })
    chief: Chief;

    @Column({ nullable: true })
    chief_id: string;

    @OneToMany(() => Voter, (voter) => voter.leader)
    voters: Voter[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
