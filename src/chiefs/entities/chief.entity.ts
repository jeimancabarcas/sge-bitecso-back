
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Leader } from '../../leaders/entities/leader.entity';

@Entity()
export class Chief {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    nombre: string;

    @Column({ unique: true })
    cedula: string;

    @Column({ nullable: true })
    telefono: string;

    @OneToMany(() => Leader, (leader) => leader.chief)
    leaders: Leader[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
