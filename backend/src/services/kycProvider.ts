// KYC Provider interfaces for pluggable verification services

export interface PanVerificationInput {
  pan: string;
  name?: string;
  dob?: string;
}

export interface PanVerificationResult {
  status: 'VERIFIED' | 'FAILED' | 'PENDING';
  maskedPan: string;
  refId: string;
  details?: any;
}

export interface AadhaarOtpInput {
  aadhaarNumber: string;
}

export interface AadhaarOtpResult {
  txnId: string;
}

export interface AadhaarVerifyInput {
  txnId: string;
  otp: string;
}

export interface AadhaarVerifyResult {
  status: 'VERIFIED' | 'FAILED';
  last4: string;
  refId: string;
  details?: any;
}

export interface PanProvider {
  verifyPAN(input: PanVerificationInput): Promise<PanVerificationResult>;
}

export interface AadhaarProvider {
  initAadhaarOtp(input: AadhaarOtpInput): Promise<AadhaarOtpResult>;
  verifyAadhaarOtp(input: AadhaarVerifyInput): Promise<AadhaarVerifyResult>;
}

// Mock implementation for development
export class MockKycProvider implements PanProvider, AadhaarProvider {
  private otpSessions = new Map<string, { aadhaarNumber: string; otp: string; expiresAt: Date }>();

  async verifyPAN(input: PanVerificationInput): Promise<PanVerificationResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { pan, name } = input;
    
    // Mock verification logic
    const isValid = pan.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/) && name && name.length > 2;
    
    return {
      status: isValid ? 'VERIFIED' : 'FAILED',
      maskedPan: `${pan.slice(0, 3)}XX${pan.slice(5, 7)}XX${pan.slice(-1)}`,
      refId: `PAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      details: {
        provider: 'mock',
        timestamp: new Date(),
      },
    };
  }

  async initAadhaarOtp(input: AadhaarOtpInput): Promise<AadhaarOtpResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const otp = '123456'; // Fixed OTP for demo
    
    // Store session
    this.otpSessions.set(txnId, {
      aadhaarNumber: input.aadhaarNumber,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    console.log(`Mock Aadhaar OTP for ${input.aadhaarNumber}: ${otp}`);

    return { txnId };
  }

  async verifyAadhaarOtp(input: AadhaarVerifyInput): Promise<AadhaarVerifyResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const session = this.otpSessions.get(input.txnId);
    
    if (!session || session.expiresAt < new Date()) {
      return {
        status: 'FAILED',
        last4: '',
        refId: '',
      };
    }

    const isValid = session.otp === input.otp;
    
    if (isValid) {
      this.otpSessions.delete(input.txnId); // Clean up session
    }

    return {
      status: isValid ? 'VERIFIED' : 'FAILED',
      last4: session.aadhaarNumber.slice(-4),
      refId: `AADHAAR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      details: {
        provider: 'mock',
        timestamp: new Date(),
      },
    };
  }
}