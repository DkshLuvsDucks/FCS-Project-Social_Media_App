declare module 'fast-two-sms' {
  interface Fast2SMSOptions {
    authorization: string;
    message: string;
    numbers: string[];
    route: string;
    variables_values?: string;
    flash?: number;
    sender_id?: string;
  }

  interface Fast2SMSResponse {
    return: boolean;
    request_id: string;
    message: string;
  }

  function sendMessage(options: Fast2SMSOptions): Promise<Fast2SMSResponse>;

  export = {
    sendMessage
  };
} 