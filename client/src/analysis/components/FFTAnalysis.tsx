import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { defaultDebounce } from "../../helpers";
import { DatasetOpen, MaskDefFFTRing } from "../../messages";
import { cbToRadius, inRectConstraint, riConstraint, roConstraints } from "../../widgets/constraints";
import DraggableHandle from "../../widgets/DraggableHandle";
import Ring from "../../widgets/Ring";
import { HandleRenderFunction } from "../../widgets/types";
import * as analysisActions from "../actions";
import { AnalysisState } from "../types";
import AnalysisItem from "./AnalysisItem";
import Disk from "../../widgets/Disk";

interface AnalysisProps {
    parameters: MaskDefFFTRing,
    analysis: AnalysisState,
    dataset: DatasetOpen,
}

const mapDispatchToProps = (dispatch: Dispatch, ownProps: AnalysisProps) => {
    return {
        handleCenterChange: defaultDebounce((cx: number, cy: number) => {
            dispatch(analysisActions.Actions.updateParameters(ownProps.analysis.id, { cx, cy }, "RESULT"));
        }),
        handleRIChange: defaultDebounce((ri: number) => {
            dispatch(analysisActions.Actions.updateParameters(ownProps.analysis.id, { ri }, "RESULT"));
        }),
        handleROChange: defaultDebounce((ro: number) => {
            dispatch(analysisActions.Actions.updateParameters(ownProps.analysis.id, { ro }, "RESULT"));
        }),
    }
}

type MergedProps = AnalysisProps & ReturnType<typeof mapDispatchToProps>

const FFTAnalysis: React.SFC<MergedProps> = ({ analysis, dataset, parameters, handleCenterChange, handleRIChange, handleROChange }) => {
    const { shape } = dataset.params;
    const imageWidth = shape[3];
    const imageHeight = shape[2];
    const { cx, cy, rad_in, rad_out, real_cx, real_cy, real_rad} = parameters;

    const riHandle = {
        x: cx - rad_in,
        y: cy,
    }
    const roHandle = {
        x: cx - rad_out,
        y: cy,
    }

    const frameViewHandlesfft: HandleRenderFunction = (handleDragStart, handleDrop) => (<>
        <DraggableHandle x={cx} y={cy}
            imageWidth={imageWidth}
            onDragMove={handleCenterChange}
            parentOnDrop={handleDrop}
            parentOnDragStart={handleDragStart}
            constraint={inRectConstraint(imageWidth, imageHeight)} />
        <DraggableHandle x={roHandle.x} y={roHandle.y}
            imageWidth={imageWidth}
            onDragMove={cbToRadius(cx, cy, handleROChange)}
            parentOnDrop={handleDrop}
            parentOnDragStart={handleDragStart}
            constraint={roConstraints(riHandle.x, cy)} />
        <DraggableHandle x={riHandle.x} y={riHandle.y}
            imageWidth={imageWidth}
            parentOnDrop={handleDrop}
            parentOnDragStart={handleDragStart}
            onDragMove={cbToRadius(cx, cy, handleRIChange)}
            constraint={riConstraint(roHandle.x, cy)} />
    </>);
    

    const frameViewWidgetsfft = (
        <Ring cx={parameters.cx} cy={parameters.cy} ri={parameters.rad_in} ro={parameters.rad_out}
            imageWidth={imageWidth} />
    )

    const subtitlefft = (
            <>Ring: center=(x={parameters.cx.toFixed(2)}, y={parameters.cy.toFixed(2)}), ri={parameters.rad_in.toFixed(2)}, ro={parameters.rad_out.toFixed(2)}</>
        )


    const realHandle = {
        x: real_cx - real_rad,
        y: real_cy,
    }
    const frameViewHandles: HandleRenderFunction = (handleDragStart, handleDrop) => (<>
        <DraggableHandle x={real_cx} y={real_cy}
            imageWidth={imageWidth}
            onDragMove={handleCenterChange}
            parentOnDrop={handleDrop}
            parentOnDragStart={handleDragStart}
            constraint={inRectConstraint(imageWidth, imageHeight)} />
        <DraggableHandle x={realHandle.x} y={realHandle.y}
            imageWidth={imageWidth}
            parentOnDrop={handleDrop}
            parentOnDragStart={handleDragStart}
            onDragMove={cbToRadius(real_cx, real_cy, handleRIChange)}
            constraint={riConstraint(roHandle.x, real_cy)} />
    </>);
    

    const frameViewWidgets = (
        <Disk cx={parameters.real_cx} cy={parameters.real_cy} r={parameters.real_rad}
            imageWidth={imageWidth} imageHeight={imageHeight} />
    )
    
    const subtitle = (
        <>Disk: center=(x={parameters.real_cx.toFixed(2)}, y={parameters.real_cy.toFixed(2)}), r={parameters.real_rad.toFixed(2)},</>
    )

    if (true) { 
        return (
            <AnalysisItem analysis={analysis} dataset={dataset}
                title="FFT analysis" subtitle={subtitlefft}
                frameViewHandles={frameViewHandlesfft} frameViewWidgets={frameViewWidgetsfft}
            />
        );
    } else {
        return (
            <AnalysisItem analysis={analysis} dataset={dataset}
                title="FFT analysis" subtitle={subtitle}
                frameViewHandles={frameViewHandles} frameViewWidgets={frameViewWidgets}
            />
        );

    }

    
}

export default connect(null, mapDispatchToProps)(FFTAnalysis);