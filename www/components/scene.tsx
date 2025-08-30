'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import ReactPannellum, { getConfig } from "react-pannellum";


interface PanoramaViewerProps {
    imageSource: string
}

const PanoramaViewer = ({ imageSource }: PanoramaViewerProps) => {
    const config = {
        autoLoad: true,
        autoRotate: 0,
        compass: false,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        mouseZoom: true,
        draggable: true,
        friction: 0.15,
        minZoom: 0.5,
        maxZoom: 2.0,
        defaultZoom: 0,
        defaultLong: 0,
        defaultLat: 0,
        hfov: 100,
        minHfov: 50,
        maxHfov: 120,
        showControls: false,
        backgroundColor: [0, 0, 0],
        quality: 'high'
    }

    return (
        <div className="w-full h-full">
            <ReactPannellum
                id="1"
                sceneId="firstScene"
                imageSource={imageSource}
                config={config}
                style={{
                    width: '100%',
                    height: '100%',
                }}
            />
        </div>
    )
}

export default PanoramaViewer
