import { withAuth } from '../interceptors/grpc-auth.interceptor.js';

export function wrapService(service: any) {
    const wrappedService: any = {};

    for (const key in service) {
        if (typeof service[key] === 'function') {
            wrappedService[key] = withAuth(service[key]);
        }
    }

    return wrappedService;
}
