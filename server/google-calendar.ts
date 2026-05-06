import { google } from "googleapis";
import { storage } from "./storage";

const DEFAULT_REDIRECT_URI = "http://localhost:5005/api/settings/google-calendar/callback";

export class GoogleCalendarService {
  private static oauth2Client = new google.auth.OAuth2();
  
  private static getRedirectUri(baseUrl?: string) {
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, "")}/api/settings/google-calendar/callback`;
    }
    return process.env.APP_URL 
      ? `${process.env.APP_URL.replace(/\/$/, "")}/api/settings/google-calendar/callback`
      : DEFAULT_REDIRECT_URI;
  }

  private static async getClient() {
    const clientId = await storage.getSystemSetting("google_calendar_client_id");
    const clientSecret = await storage.getSystemSetting("google_calendar_client_secret");
    const tokens = await storage.getSystemSetting("google_calendar_tokens");

    if (!clientId?.value || !clientSecret?.value) {
      throw new Error("Credenciais do Google Calendar não configuradas.");
    }

    const client = new google.auth.OAuth2(
      clientId.value,
      clientSecret.value,
      this.getRedirectUri()
    );

    if (tokens?.value) {
      client.setCredentials(JSON.parse(tokens.value));
    }

    return client;
  }

  static async getAuthUrl(baseUrl?: string) {
    const clientId = await storage.getSystemSetting("google_calendar_client_id");
    const clientSecret = await storage.getSystemSetting("google_calendar_client_secret");

    if (!clientId?.value || !clientSecret?.value) {
      throw new Error("Configure o Client ID e Client Secret antes de conectar.");
    }

    const redirectUri = this.getRedirectUri(baseUrl);
    console.log("Generating Auth URL with redirectUri:", redirectUri);
    
    const client = new google.auth.OAuth2(
      clientId.value,
      clientSecret.value,
      redirectUri
    );

    return client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      prompt: "consent",
    });
  }

  static async handleCallback(code: string, baseUrl?: string) {
    const clientId = await storage.getSystemSetting("google_calendar_client_id");
    const clientSecret = await storage.getSystemSetting("google_calendar_client_secret");

    const redirectUri = this.getRedirectUri(baseUrl);
    console.log("Handling Callback with redirectUri:", redirectUri);

    const client = new google.auth.OAuth2(
      clientId?.value,
      clientSecret?.value,
      redirectUri
    );

    const { tokens } = await client.getToken(code);
    await storage.upsertSystemSetting("google_calendar_tokens", JSON.stringify(tokens));
    return tokens;
  }

  static async getStatus() {
    const clientId = await storage.getSystemSetting("google_calendar_client_id");
    const clientSecret = await storage.getSystemSetting("google_calendar_client_secret");
    const tokens = await storage.getSystemSetting("google_calendar_tokens");

    return {
      isConnected: !!tokens?.value,
      hasCredentials: !!clientId?.value && !!clientSecret?.value,
      clientId: clientId?.value || "",
      clientSecret: clientSecret?.value || "",
    };
  }

  static async isConnected() {
    try {
      const tokens = await storage.getSystemSetting("google_calendar_tokens");
      return !!tokens?.value;
    } catch {
      return false;
    }
  }

  static async createEvent(eventData: {
    title: string;
    description?: string;
    start: Date;
    end?: Date;
    location?: string;
  }) {
    try {
      if (!(await this.isConnected())) return null;

      const client = await this.getClient();
      const calendar = google.calendar({ version: "v3", auth: client });

      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start: {
            dateTime: eventData.start.toISOString(),
          },
          end: {
            dateTime: (eventData.end || new Date(eventData.start.getTime() + 2 * 60 * 60 * 1000)).toISOString(),
          },
        },
      });

      return res.data.id;
    } catch (error) {
      console.error("Erro ao criar evento no Google Calendar:", error);
      return null;
    }
  }

  static async updateEvent(googleEventId: string, eventData: {
    title: string;
    description?: string;
    start: Date;
    end?: Date;
    location?: string;
  }) {
    try {
      if (!(await this.isConnected()) || !googleEventId) return null;

      const client = await this.getClient();
      const calendar = google.calendar({ version: "v3", auth: client });

      const res = await calendar.events.update({
        calendarId: "primary",
        eventId: googleEventId,
        requestBody: {
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start: {
            dateTime: eventData.start.toISOString(),
          },
          end: {
            dateTime: (eventData.end || new Date(eventData.start.getTime() + 2 * 60 * 60 * 1000)).toISOString(),
          },
        },
      });

      return res.data.id;
    } catch (error) {
      console.error("Erro ao atualizar evento no Google Calendar:", error);
      return null;
    }
  }

  static async deleteEvent(googleEventId: string) {
    try {
      if (!(await this.isConnected()) || !googleEventId) return;

      const client = await this.getClient();
      const calendar = google.calendar({ version: "v3", auth: client });

      await calendar.events.delete({
        calendarId: "primary",
        eventId: googleEventId,
      });
    } catch (error) {
      console.error("Erro ao deletar evento no Google Calendar:", error);
    }
  }
}
