import api from "../axios.service";

export interface UserSettings {
  cfApiKey?: string;
  discordWebhook?: string;
  language?: "en" | "es";
}

export const getSettings = async (): Promise<UserSettings> => {
  try {
    const response = await api.get("/settings");
    return response.data;
  } catch (error) {
    console.error("Error fetching settings:", error);
    throw error;
  }
};

export const updateSettings = async (settings: UserSettings): Promise<UserSettings> => {
  try {
    const response = await api.patch("/settings", settings);
    return response.data;
  } catch (error) {
    console.error("Error updating settings:", error);
    throw error;
  }
};

export const testDiscordWebhook = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post("/settings/test-discord-webhook");
    return response.data;
  } catch (error) {
    console.error("Error testing Discord webhook:", error);
    throw error;
  }
};
