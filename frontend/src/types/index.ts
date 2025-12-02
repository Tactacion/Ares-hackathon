// TypeScript types matching backend Pydantic models

export interface Aircraft {
  callsign: string;
  icao24: string;
  latitude: number;
  longitude: number;
  altitude_ft: number;
  velocity_kts: number;
  heading_deg: number;
  vertical_rate_fpm: number;
  on_ground: boolean;
  last_contact: number;
  predicted_path?: number[][]; // List of [lon, lat]
}

export interface WeatherCondition {
  airport: string;
  observation_time: string;
  visibility_sm: number;
  ceiling_ft: number | null;
  wind_speed_kts: number;
  wind_direction_deg: number;
  phenomena: string[];
  temperature_c: number;
  dewpoint_c: number;
  altimeter_inhg: number;
  raw_metar: string;
}

export interface NTSBReference {
  event_id: string;
  date: string;
  location: string;
  description: string;
  similar_factors: string[];
}

export type RiskType = "RUNWAY_INCURSION" | "SEPARATION" | "WEATHER" | "COMMUNICATION";
export type RiskSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface RiskAlert {
  id: string;
  timestamp: string;
  risk_type: RiskType;
  severity: RiskSeverity;
  aircraft_involved: string[];
  description: string;
  ntsb_reference: NTSBReference | null;
  recommended_action: string;
  pilot_message: string | null;
  reasoning: string;
  auto_resolve: boolean;
}

export type WorkloadLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface SectorStatus {
  timestamp: string;
  aircraft_count: number;
  aircraft: Aircraft[];
  active_alerts: RiskAlert[];
  weather: WeatherCondition | null;
  controller_workload: WorkloadLevel;
  safe_corridors?: number[][][]; // List of paths (each path is list of [lon, lat])
}

export interface WebSocketMessage {
  type: "sector_update" | "alert" | "weather_update";
  data: SectorStatus;
}

export interface Task {
  id: string;
  description: string;
  priority: 'IMMEDIATE' | 'URGENT' | 'ROUTINE';
  status: 'PENDING' | 'COMPLETED' | 'TRANSMITTED';
  category: string;
  created_at: string;
}
