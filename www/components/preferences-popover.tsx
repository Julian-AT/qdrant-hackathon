"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, Globe, Lock } from "lucide-react";
import { useSceneVisibility } from "@/hooks/use-chat-visibility";
import type { VisibilityType } from "./visibility-selector";

interface PreferencesPopoverProps {
    sceneId: string;
    selectedVisibilityType: VisibilityType;
}

export function PreferencesPopover({ sceneId, selectedVisibilityType }: PreferencesPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { visibilityType, setVisibilityType } = useSceneVisibility({
        sceneId,
        initialVisibilityType: selectedVisibilityType,
    });

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex-shrink-0"
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Scene preferences</p>
                </TooltipContent>
            </Tooltip>
            <PopoverContent
                className="w-80 p-4 bg-card"
                side="top"
                align="start"
                sideOffset={8}

            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-zinc-100">Scene Preferences</h4>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    {visibilityType === 'public' ? (
                                        <Globe className="h-4 w-4 text-zinc-400" />
                                    ) : (
                                        <Lock className="h-4 w-4 text-zinc-400" />
                                    )}
                                    <label className="text-sm font-medium text-zinc-100">
                                        {visibilityType === 'public' ? 'Public Scene' : 'Private Scene'}
                                    </label>
                                </div>
                                <p className="text-xs text-zinc-400">
                                    {visibilityType === 'public'
                                        ? 'Anyone with the link can access this scene'
                                        : 'Only you can access this scene'
                                    }
                                </p>
                            </div>
                            <Switch
                                checked={visibilityType === 'public'}
                                onCheckedChange={(checked) => {
                                    setVisibilityType(checked ? 'public' : 'private');
                                }}
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
