import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>(); const request = host.switchToHttp().getRequest<Request>();
    const isHttp = error instanceof HttpException; const status = isHttp ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? error.getResponse() : null;
    const message = typeof body === 'object' && body && 'message' in body ? (body as { message: unknown }).message : 'Internal server error';
    response.status(status).json({ success: false, error: { code: HttpStatus[status], message, details: status === 500 ? undefined : body }, path: request.url, timestamp: new Date().toISOString() });
  }
}
