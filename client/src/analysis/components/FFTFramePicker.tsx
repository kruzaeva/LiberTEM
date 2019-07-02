import React from "react";
import { useDispatch } from "react-redux";
import { AnalysisTypes } from "../../messages";
import { inRectConstraint } from "../../widgets/constraints";
import DraggableHandle from "../../widgets/DraggableHandle";
import { HandleRenderFunction } from "../../widgets/types";
import * as analysisActions from "../actions";

const useFFTFramePicker = ({
    enabled, scanWidth, scanHeight, jobIndex, analysisId, cx, cy, real_rad, real_centerx, real_centery, setCx, setCy, type
}: {
    enabled: boolean, scanWidth: number, scanHeight: number,
    jobIndex: number, analysisId: string,
    cx: number, cy: number, setCx: (newCx: number) => void, setCy: (newCy: number) => void,
    real_rad: number | null, real_centerx: number | null, real_centery: number | null
    type: AnalysisTypes.PICK_FRAME | AnalysisTypes.PICK_FFT_FRAME
}) => {

    const dispatch = useDispatch();

    React.useEffect(() => {
        if (enabled) {
            dispatch(analysisActions.Actions.run(analysisId, jobIndex, {
                type: AnalysisTypes.PICK_FFT_FRAME,
                parameters: { x: cx, y: cy, real_rad, real_centerx, real_centery },
            }))

        }
    }, [analysisId, cx, cy, enabled, jobIndex, real_rad, real_centerx, real_centery]);

    const onPickChange = (pickX: number, pickY: number) => {
        const newX = Math.round(pickX);
        const newY = Math.round(pickY);
        if (cx === newX && cy === newY) {
            return;
        }
        setCx(newX);
        setCy(newY);
    }

    const renderPickHandle: HandleRenderFunction = (onDragStart, onDrop) => (
        <DraggableHandle x={cx} y={cy} withCross={true}
            imageWidth={scanWidth}
            onDragMove={onPickChange}
            parentOnDragStart={onDragStart}
            parentOnDrop={onDrop}
            constraint={inRectConstraint(scanWidth, scanHeight)} />
    )

    return { coords: { cx, cy }, handles: renderPickHandle };
}

export default useFFTFramePicker;