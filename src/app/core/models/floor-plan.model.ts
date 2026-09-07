import { ZoneType } from './workspace-session.model';

/**
 * Floor Plans, Seat Elements, and Seat Element Types domain models matching OpenAPI 3.0.4.
 * Endpoints: /api/FloorPlans, /api/SeatElements, /api/SeatElementTypes
 */

export interface FloorPlanDto {
  id: string;
  name: string;
  zone: ZoneType;
  canvasWidth: number;
  canvasHeight: number;
  isPublished: boolean;
  roomId?: string | null;
}

export interface CreateFloorPlanDto {
  name: string;
  zone: ZoneType;
  canvasWidth: number;
  canvasHeight: number;
  roomId?: string | null;
}

export interface UpdateFloorPlanDto {
  name: string;
  zone: ZoneType;
  canvasWidth: number;
  canvasHeight: number;
  isPublished: boolean;
  roomId?: string | null;
}

export interface SeatElementDto {
  id: string;
  label: string;
  seatElementTypeId: string;
  seatElementTypeName?: string;
  seatElementTypeImageUrl?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  isBookable: boolean;
  floorPlanId: string;
}

export interface CreateSeatElementDto {
  label: string;
  seatElementTypeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  isBookable: boolean;
  floorPlanId: string;
}

export interface UpdateSeatElementDto {
  label: string;
  seatElementTypeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  isBookable: boolean;
}

export interface SyncSeatElementItemDto {
  id?: string | null;
  label: string;
  seatElementTypeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  isBookable: boolean;
}

export interface SyncSeatElementsDto {
  elements: SyncSeatElementItemDto[];
}

export interface SeatElementTypeDto {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  defaultWidth: number;
  defaultHeight: number;
  defaultCapacity: number;
  isBookableByDefault: boolean;
  elementsCount?: number;
}

export interface CreateSeatElementTypeDto {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  defaultWidth: number;
  defaultHeight: number;
  defaultCapacity: number;
  isBookableByDefault?: boolean;
}

export interface UpdateSeatElementTypeDto {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  defaultWidth: number;
  defaultHeight: number;
  defaultCapacity: number;
  isBookableByDefault?: boolean;
}
