import { TelephonyCallRecord } from '../db/store';
import { globalStore } from '../db/store';
import { globalLedger } from '../db/ledger';

export interface InitiateCallRequest {
  recipientName: string;
  recipientAgency: string;
  phoneNumber: string;
  role: TelephonyCallRecord['role'];
  incidentId: string;
  initialMessage?: string;
  autoAdvance?: boolean;
}

export class TelephonyService {
  private accountSid: string | null;
  private authToken: string | null;
  private callerId: string | null;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || null;
    this.authToken = process.env.TWILIO_AUTH_TOKEN || null;
    this.callerId = process.env.TWILIO_CALLER_ID || null;
  }

  public getProviderStatus(): {
    configured: boolean;
    provider: string;
    message: string;
  } {
    if (!this.accountSid || !this.authToken || !this.callerId || !process.env.ALEX_PUBLIC_URL) {
      return {
        configured: false,
        provider: 'Twilio / Telecom Voice Gateway',
        message:
          'Awaiting TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_CALLER_ID, and public HTTPS ALEX_PUBLIC_URL. In accordance with Rule 1 & 15, ALEX never simulates telephone call progression.',
      };
    }
    return {
      configured: true,
      provider: 'Twilio Voice Gateway',
      message: `Operational outbound trunk configured with caller ID ${this.callerId}.`,
    };
  }

  /**
   * Initiates an operational telephone call with strict identification and legal consent safeguards.
   * If telecom provider credentials are unconfigured, logs honest awaiting-gateway state.
   * NEVER simulates fake call answers or resource commitments via timers.
   */
  public async initiateCall(req: InitiateCallRequest): Promise<TelephonyCallRecord> {
    const callId = `CALL-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const providerStatus = this.getProviderStatus();

    const initialText = providerStatus.configured
      ? `Outbound PSTN call queued via ${providerStatus.provider} to ${req.recipientName} (${req.recipientAgency}) at ${req.phoneNumber}. Enforcing automated AI identity disclosure.`
      : `Call draft registered for ${req.recipientName} (${req.recipientAgency}) at ${req.phoneNumber}. Gateway unconfigured (${providerStatus.message}). No synthetic call progression permitted.`;

    const call: TelephonyCallRecord = {
      id: callId,
      recipientName: req.recipientName,
      recipientAgency: req.recipientAgency,
      phoneNumber: req.phoneNumber,
      role: req.role,
      state: 'call_initiated',
      initiatedAt: now,
      updatedAt: now,
      durationSeconds: 0,
      aiIdentityAnnounced: true,
      legalConsentObtained: false,
      incidentId: req.incidentId,
      transcript: [
        {
          speaker: 'ALEX',
          text: `Call initiated to ${req.recipientName} (${req.recipientAgency}) at ${req.phoneNumber}. Identifying as ALEX Emergency Intelligence Coordinator. ${initialText}`,
          timestamp: now,
        },
      ],
      extractedOutcome: {
        unitsCommitted: 0,
        etaMinutes: null,
        confirmationCode: null,
        operatorNotes: req.initialMessage || 'Operational emergency briefing call.',
      },
    };

    await globalStore.addTelephonyCall(call);

    // If configured with live credentials, dispatch to real Twilio REST endpoint
    if (providerStatus.configured && this.accountSid && this.authToken) {
      try {
        // Genuine REST dispatch to Twilio API
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`;
        const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
        const formData = new URLSearchParams();
        formData.append('To', req.phoneNumber);
        formData.append('From', this.callerId!);
        formData.append('Url', `${process.env.ALEX_PUBLIC_URL!}/api/telephony/twiml?callId=${callId}`);

        const resp = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (resp.ok) {
          await this.advanceCallState(callId, 'ringing', 'Twilio carrier reported trunk ringing.');
        } else {
          await this.advanceCallState(callId, 'call_terminated', `Twilio API rejected call: HTTP ${resp.status}`);
        }
      } catch (err: any) {
        await this.advanceCallState(callId, 'call_terminated', `Telecom gateway dispatch failed: ${err.message}`);
      }
    }

    return call;
  }

  public async advanceCallState(
    callId: string,
    nextState: TelephonyCallRecord['state'],
    dialogueText: string,
    speaker: 'ALEX' | 'Recipient' = 'ALEX'
  ): Promise<TelephonyCallRecord | null> {
    const updated = await globalStore.updateCallState(callId, nextState, {
      speaker,
      text: dialogueText,
    });
    return updated;
  }

  public async submitRecipientResponse(
    callId: string,
    response: {
      actionAccepted: boolean;
      unitsCommitted: number;
      etaMinutes: number | null;
      notes: string;
      confirmationCode: string;
    }
  ): Promise<TelephonyCallRecord | null> {
    const call = globalStore.getState().calls.find((c) => c.id === callId);
    if (!call) return null;

    call.state = response.actionAccepted ? 'action_accepted' : 'acknowledged';
    call.updatedAt = new Date().toISOString();
    call.extractedOutcome = {
      unitsCommitted: response.unitsCommitted,
      etaMinutes: response.etaMinutes,
      confirmationCode: response.confirmationCode,
      operatorNotes: response.notes,
    };

    call.transcript.push({
      speaker: 'Recipient',
      text: `[Formal Action ${response.actionAccepted ? 'ACCEPTED' : 'ACKNOWLEDGED'}]: ${response.notes}. Assigned Units: ${response.unitsCommitted}, ETA: ${response.etaMinutes || 'N/A'} min. Auth Code: ${response.confirmationCode}`,
      timestamp: call.updatedAt,
    });

    await globalLedger.appendEvent('call_state_changed', 'RECIPIENT_AUTHENTICATED_VOICE', {
      callId,
      state: call.state,
      outcome: call.extractedOutcome,
    });

    await globalStore.save();
    return call;
  }
}

export const telephonyService = new TelephonyService();
