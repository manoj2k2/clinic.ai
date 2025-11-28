import { Component, EventEmitter, Output } from '@angular/core';
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-ehic-scanner',
  templateUrl: './ehic-scanner.component.html',
  styleUrls: ['./ehic-scanner.component.css']
})
export class EhicScannerComponent {
  @Output() scanSuccess = new EventEmitter<any>();
  
  allowedFormats = [ BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417 ];
  isScanning = false;
  hasPermission: boolean | null = null;
  hasDevices: boolean | null = null;
  
  toggleScanner() {
    this.isScanning = !this.isScanning;
    if (!this.isScanning) {
      this.hasPermission = null;
      this.hasDevices = null;
    }
  }

  onScanSuccess(resultString: string) {
    this.isScanning = false;
    console.log('Scanned result:', resultString);
    const parsedData = this.parseEhicData(resultString);
    this.scanSuccess.emit(parsedData);
  }

  onHasPermission(has: boolean) {
    console.log('Permission response:', has);
    this.hasPermission = has;
  }

  onCamerasFound(devices: MediaDeviceInfo[]) {
    console.log('Cameras found:', devices);
    this.hasDevices = true;
  }

  onCamerasNotFound() {
    console.log('No cameras found');
    this.hasDevices = false;
  }

  // Basic parser - this would need to be adapted based on specific country implementations
  // Many use a specific XML or pipe-delimited format in the barcode
  private parseEhicData(data: string): any {
    // Heuristic parsing
    const result: any = {
      raw: data
    };

    // Try to find dates (YYYY-MM-DD or DD/MM/YYYY)
    const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/;
    const dateMatch = data.match(dateRegex);
    if (dateMatch) {
      result.expiryDate = dateMatch[0];
    }

    // If it looks like XML
    if (data.startsWith('<') && data.includes('EHIC')) {
       // Simple XML extraction logic could go here
    }

    return result;
  }
}
