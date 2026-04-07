const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let device;
let characteristic;

export async function connectPostureShirt() {
  device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SERVICE_UUID] }],
    optionalServices: [SERVICE_UUID],
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  characteristic = await service.getCharacteristic(TX_UUID);

  await characteristic.startNotifications();
  characteristic.addEventListener('characteristicvaluechanged', handleNotification);

  console.log('Connected to', device.name || 'BLE device');
}

function handleNotification(event) {
  const value = event.target.value;
  const text = new TextDecoder().decode(value);

  try {
    const data = JSON.parse(text);
    console.log('t_ms:', data.t_ms, 'angle:', data.angle, 'status:', data.status);
  } catch (err) {
    console.warn('Received non-JSON BLE payload:', text);
  }
}

export async function disconnectPostureShirt() {
  if (device?.gatt?.connected) {
    await characteristic?.stopNotifications?.();
    device.gatt.disconnect();
    console.log('Disconnected');
  }
}