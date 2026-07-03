import net from 'net';
import { logger } from '../config/logger.js';
import * as iotService from './iot.service.js';

async function handleSocketCommand(socket: net.Socket, payloadStr: string, remoteAddress: string) {
  try {
    logger.info(`Received complete command from device [${remoteAddress}]: ${payloadStr}`);

    // Protocol formats:
    // 1. RFID scan -> "RFID:card_uid,device_id,direction"
    // 2. Biometric scan -> "BIO:biometric_id,device_id,direction"

    if (payloadStr.startsWith('RFID:')) {
      const parts = payloadStr.replace('RFID:', '').split(',');
      if (parts.length === 3) {
        const [cardUid, deviceId, direction] = parts;
        const result = await iotService.processRfidScan({ cardUid, deviceId, direction });

        logger.info(
          `Access processing result for Card [${cardUid}]: ${result?.status?.toUpperCase()}`
        );
        socket.write(`STATUS:${result?.status?.toUpperCase()}\n`);
      } else {
        socket.write('ERROR:INVALID_RFID_PAYLOAD\n');
      }
    } else if (payloadStr.startsWith('BIO:')) {
      const parts = payloadStr.replace('BIO:', '').split(',');
      if (parts.length === 3) {
        const [biometricIdStr, deviceId, direction] = parts;
        const biometricId = parseInt(biometricIdStr, 10);

        if (!isNaN(biometricId)) {
          const result = await iotService.processBiometricScan({
            biometricId,
            deviceId,
            direction,
          });
          logger.info(
            `Access processing result for Bio [${biometricId}]: ${result?.status?.toUpperCase()}`
          );
          socket.write(`STATUS:${result?.status?.toUpperCase()}\n`);
        } else {
          socket.write('ERROR:INVALID_BIO_ID\n');
        }
      } else {
        socket.write('ERROR:INVALID_BIO_PAYLOAD\n');
      }
    } else {
      logger.warn(`Unknown hardware protocol frame: ${payloadStr}`);
      socket.write('ERROR:UNKNOWN_PROTOCOL\n');
    }
  } catch (err: any) {
    logger.error(`Error parsing hardware socket packet: ${err.message}`);
    socket.write('ERROR:INTERNAL_SERVER_ERROR\n');
  }
}

export function startTcpServer(port: number) {
  const server = net.createServer((socket) => {
    const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.info(`Hardware device connected: ${remoteAddress}`);

    // Production optimizations: keep-alive and timeouts
    socket.setKeepAlive(true, 10000); // 10s TCP Keep-Alive
    socket.setTimeout(30000); // 30s connection timeout

    let buffer = '';

    socket.on('data', async (chunk) => {
      buffer += chunk.toString();

      // Look for line-breaks (typical delimiter for hardware serial/TCP feeds)
      let lineIndex = buffer.indexOf('\n');
      while (lineIndex !== -1) {
        const line = buffer.substring(0, lineIndex).trim();
        buffer = buffer.substring(lineIndex + 1);

        if (line) {
          await handleSocketCommand(socket, line, remoteAddress);
        }
        lineIndex = buffer.indexOf('\n');
      }
    });

    socket.on('timeout', () => {
      logger.warn(`Connection timeout on ${remoteAddress}. Closing idle socket.`);
      socket.destroy();
    });

    socket.on('close', () => {
      logger.info(`Hardware connection closed: ${remoteAddress}`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error on connection ${remoteAddress}: ${err.message}`);
    });
  });

  server.listen(port, () => {
    logger.info(`IoT Hardware TCP Socket Listener running on port ${port}`);
  });
}
