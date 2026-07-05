import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { getFeatureFlag } from '../services/flag.service.js';
import path from 'path';
import donenv from 'dotenv';
donenv.config();

type FlagRequest = {
    key: string;
    context?: Record<string, string>;
};

type FlagResponse = {
    enabled: boolean;
};

const packageDefinition = protoLoader.loadSync(
    path.join(__dirname, '../../proto/feature_flag.proto')
);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const flagProto = protoDescriptor.featureflag;

async function isFeatureEnabled(
    call: grpc.ServerUnaryCall<FlagRequest, FlagResponse>,
    callback: grpc.sendUnaryData<FlagResponse>
) {
    try {
        const { key, context } = call.request;
        const enabled = await getFeatureFlag(key, context);
        callback(null, { enabled });
    } catch (error) {
        callback(
            {
                code: grpc.status.INTERNAL,
                message: 'Error checking feature flag',
            },
            null
        );
    }
}

const server = new grpc.Server();
server.addService(flagProto.FlagService.service, { IsFeatureEnabled: isFeatureEnabled });

let grpcPort = process.env.GRPC_PORT || '50051';

server.bindAsync(`localhost:${grpcPort}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error('Error starting gRPC server:', err);
        return;
    }
    console.log(`gRPC server started on localhost:${port}`);
});
