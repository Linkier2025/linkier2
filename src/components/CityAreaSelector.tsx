import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, getAreasForCity, CITY_NAMES } from "@/lib/locationConfig";

interface CityAreaSelectorProps {
  city: string;
  area: string;
  onCityChange: (city: string) => void;
  onAreaChange: (area: string) => void;
  disabled?: boolean;
}

export function CityAreaSelector({ city, area, onCityChange, onAreaChange, disabled }: CityAreaSelectorProps) {
  const [customCity, setCustomCity] = useState(false);
  const [customArea, setCustomArea] = useState(false);

  const isPredefinedCity = CITY_NAMES.includes(city);
  const areas = getAreasForCity(city);
  const isPredefinedArea = areas.includes(area);

  useEffect(() => {
    if (city && !isPredefinedCity) setCustomCity(true);
  }, [city, isPredefinedCity]);

  useEffect(() => {
    if (area && !isPredefinedArea && areas.length > 0) setCustomArea(true);
  }, [area, isPredefinedArea, areas.length]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>City</Label>
        {customCity ? (
          <div className="space-y-1">
            <Input
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Type city name..."
              disabled={disabled}
            />
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => { setCustomCity(false); onCityChange(""); }}
            >
              Select from list
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <Select value={city} onValueChange={(v) => {
              if (v === "__other__") {
                setCustomCity(true);
                onCityChange("");
                onAreaChange("");
              } else {
                onCityChange(v);
                onAreaChange("");
                setCustomArea(false);
              }
            }} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {CITY_NAMES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                <SelectItem value="__other__">Other (type manually)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Area / Suburb</Label>
        {customArea || areas.length === 0 ? (
          <div className="space-y-1">
            <Input
              value={area}
              onChange={(e) => onAreaChange(e.target.value)}
              placeholder="Type area name..."
              disabled={disabled}
            />
            {areas.length > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => { setCustomArea(false); onAreaChange(""); }}
              >
                Select from list
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <Select value={area} onValueChange={(v) => {
              if (v === "__other__") {
                setCustomArea(true);
                onAreaChange("");
              } else {
                onAreaChange(v);
              }
            }} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
                <SelectItem value="__other__">Other (type manually)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
