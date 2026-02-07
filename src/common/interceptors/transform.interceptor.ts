
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    success: boolean;
    data: T;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        return next.handle().pipe(
            map((data) => {
                // Handle specific cases where data might already be wrapped or is a stream (like File)
                const response = context.switchToHttp().getResponse();

                // If it's a file download/report, don't wrap it
                if (response.getHeader('Content-Type')?.includes('spreadsheet') ||
                    response.getHeader('Content-Type')?.includes('excel')) {
                    return data;
                }

                return {
                    success: true,
                    data: data,
                };
            }),
        );
    }
}
