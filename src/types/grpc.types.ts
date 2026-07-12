import * as grpc from '@grpc/grpc-js';

export type AuthenticatedUnaryCall<Req, Res> = grpc.ServerUnaryCall<Req, Res> & {
    tenantId: string;
};

export type AuthenticatedStreamCall<Req, Res> = grpc.ServerWritableStream<Req, Res> & {
    tenantId: string;
};
