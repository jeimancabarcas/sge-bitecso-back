
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Voter } from '../../voters/entities/voter.entity';

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

    @Column({ nullable: true })
    jefe: string;

    @OneToMany(() => Voter, (voter) => voter.leader)
    voters: Voter[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
