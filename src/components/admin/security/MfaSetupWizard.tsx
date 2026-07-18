// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Shield, Smartphone, Key, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { useMfaManagement } from '@/hooks/useMfaManagement';
import { useToast } from '@/hooks/use-toast';

interface MfaSetupWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
  isRequired?: boolean;
}

export const MfaSetupWizard: React.FC<MfaSetupWizardProps> = ({
  onComplete,
  onCancel,
  isRequired = false
}) => {
  const [step, setStep] = useState(1);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [totpCode, setTotpCode] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);
  
  const { 
    isLoading,
    startMfaEnrollment,
    completeMfaEnrollment
  } = useMfaManagement();
  
  const { toast } = useToast();

  const handleStartEnrollment = async () => {
    const data = await startMfaEnrollment();
    if (data) {
      setEnrollmentData(data);
      setStep(2);
    }
  };

  const handleCopyBackupCodes = async () => {
    if (enrollmentData?.backup_codes) {
      const codesText = enrollmentData.backup_codes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopiedCodes(true);
      toast({
        title: "Backup Codes Copied",
        description: "Your backup codes have been copied to clipboard. Store them safely!",
      });
    }
  };

  const handleCompleteSetup = async () => {
    if (!enrollmentData || !totpCode) return;
    
    const success = await completeMfaEnrollment(enrollmentData.session_token, totpCode);
    if (success) {
      setStep(4);
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Enhanced Security Setup</h3>
          <p className="text-sm text-muted-foreground">
            {isRequired 
              ? "Two-factor authentication is required for your role"
              : "Add an extra layer of security to your account"
            }
          </p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Two-factor authentication (MFA) significantly improves your account security by requiring 
          a second verification step during login.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="font-medium">Authenticator App</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Use apps like Google Authenticator, Authy, or 1Password to generate verification codes.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Key className="h-5 w-5 text-primary" />
              <span className="font-medium">Backup Codes</span>
            </div>
            <p className="text-sm text-muted-foreground">
              One-time backup codes for account recovery when your device isn't available.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={handleStartEnrollment}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? "Setting up..." : "Start Setup"}
        </Button>
        {!isRequired && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
        <p className="text-sm text-muted-foreground">
          Open your authenticator app and scan this QR code
        </p>
      </div>

      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-lg border-2 border-border">
          {enrollmentData?.qr_code_url && (
            <div className="w-48 h-48 bg-muted flex items-center justify-center">
              <div className="text-center">
                <Smartphone className="h-8 w-8 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  QR Code will be displayed here
                </p>
                <p className="text-xs font-mono mt-2 break-all">
                  {enrollmentData.totp_secret}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Alert>
        <AlertDescription>
          Can't scan? Manually enter this secret key in your authenticator app: 
          <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
            {enrollmentData?.totp_secret}
          </code>
        </AlertDescription>
      </Alert>

      <Button onClick={() => setStep(3)} className="w-full">
        I've Added the Account
      </Button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Save Your Backup Codes</h3>
        <p className="text-sm text-muted-foreground">
          Store these codes safely. Each can only be used once to access your account if your device is unavailable.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {enrollmentData?.backup_codes?.map((code: string, index: number) => (
              <div key={index} className="bg-muted p-2 rounded text-center">
                {code}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleCopyBackupCodes}
        variant="outline" 
        className="w-full"
        disabled={copiedCodes}
      >
        <Copy className="h-4 w-4 mr-2" />
        {copiedCodes ? "Copied!" : "Copy Backup Codes"}
      </Button>

      <Separator />

      <div className="space-y-3">
        <Label htmlFor="totp-verify">Enter Verification Code</Label>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app to complete setup.
        </p>
        <Input
          id="totp-verify"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="text-center text-lg font-mono"
          maxLength={6}
        />
      </div>

      <Button 
        onClick={handleCompleteSetup}
        disabled={totpCode.length !== 6 || isLoading || !copiedCodes}
        className="w-full"
      >
        {isLoading ? "Verifying..." : "Complete Setup"}
      </Button>

      {!copiedCodes && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please copy your backup codes before completing the setup.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-green-700 mb-2">
          MFA Setup Complete!
        </h3>
        <p className="text-muted-foreground">
          Two-factor authentication has been successfully enabled for your account.
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-2">What's Next?</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• You'll need your authenticator app for future logins</li>
          <li>• Keep your backup codes in a secure location</li>
          <li>• You can manage MFA settings in your security preferences</li>
        </ul>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication Setup
          </CardTitle>
          <Badge variant={isRequired ? "destructive" : "secondary"}>
            {isRequired ? "Required" : "Optional"}
          </Badge>
        </div>
        <CardDescription>
          Step {step} of 4: {
            step === 1 ? "Introduction" :
            step === 2 ? "Scan QR Code" :
            step === 3 ? "Verify & Save Codes" :
            "Complete"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </CardContent>
    </Card>
  );
};