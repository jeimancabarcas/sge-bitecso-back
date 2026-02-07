
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : { message: 'Internal server error' };

        let message = '';
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            if (Array.isArray((exceptionResponse as any).message)) {
                message = (exceptionResponse as any).message.join(', ');
            } else {
                message = (exceptionResponse as any).message || (exceptionResponse as any).error || 'Error';
            }
        } else {
            message = exceptionResponse as string;
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            message: message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
