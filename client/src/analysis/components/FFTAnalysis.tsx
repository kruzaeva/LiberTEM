import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { defaultDebounce } from "../../helpers";
import { DatasetOpen, MaskDefFFTRing } from "../../messages";
import { cbToRadius, inRectConstraint, riConstraint, roConstraints, keepOnCY } from "../../widgets/constraints";
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
        handleCenterChange: defaultDebounce((real_cx: number, real_cy: number) => {
            dispatch(analysisActions.Actions.updateParameters(ownProps.analysis.id, { real_cx, real_cy }, "RESULT"));
        }),
        handleRIChange: defaultDebounce((rad_in: number) => {
            dispatch(analysisActions.Actions.updateParameters(ownProps.analysis.id, { rad_in }, "RESULT"));
        }),
        handleROChange: defaultDebounce((rad_out: number) => {
            dispatch(analysisActions.Actions.updateParameters(ownProps.analysis.id, { rad_out }, "RESULT"));
        }),
        handleRChange: defaultDebounce((real_rad: number) => {
            dispatch(analysisActions.Actions.updateParameters(ownProps.analysis.id, { real_rad }, "RESULT"));
        }), 
    }
}

type MergedProps = AnalysisProps & ReturnType<typeof mapDispatchToProps>

const FFTAnalysis: React.SFC<MergedProps> = ({ analysis, dataset, parameters, handleCenterChange, handleRIChange, handleROChange, handleRChange }) => {
    const { shape } = dataset.params;
    const imageWidth = shape[3];
    const imageHeight = shape[2];
    const {rad_in, rad_out, real_cx, real_cy, real_rad} = parameters;
    const fftCx = imageWidth/2
    const fftCy = imageHeight/2
    const fftRiHandle = {
        x: fftCx - rad_in,
        y: fftCy,
    }
    const fftRoHandle = {
        x: fftCx - rad_out,
        y: fftCy,
    }

    const frameViewHandlesfft: HandleRenderFunction = (handleDragStart, handleDrop) => (<>
        <DraggableHandle x={fftRoHandle.x} y={fftRoHandle.y}
            imageWidth={imageWidth}
            onDragMove={cbToRadius(fftCx, fftCy, handleROChange)}
            parentOnDrop={handleDrop}
            parentOnDragStart={handleDragStart}
            constraint={roConstraints(fftRiHandle.x, fftCy)} />
        <DraggableHandle x={fftRiHandle.x} y={fftRiHandle.y}
            imageWidth={imageWidth}
            parentOnDrop={handleDrop}
            parentOnDragStart={handleDragStart}
            onDragMove={cbToRadius(fftCx, fftCy, handleRIChange)}
            constraint={riConstraint(fftRoHandle.x, fftCy)} />
    </>);
    

    const frameViewWidgetsfft = (
        <Ring cx={fftCx} cy={fftCy} ri={parameters.rad_in} ro={parameters.rad_out}
            imageWidth={imageWidth} />
    )

    const subtitlefft = (
            <>Ring: ri={parameters.rad_in.toFixed(2)}, ro={parameters.rad_out.toFixed(2)}</>
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
            onDragMove={cbToRadius(real_cx, real_cy, handleRChange)}
            constraint={keepOnCY(real_cy)} />
    </>);
    

    const frameViewWidgets = (
        <Disk cx={parameters.real_cx} cy={parameters.real_cy} r={parameters.real_rad}
            imageWidth={imageWidth} imageHeight={imageHeight} />
    )
    
    const subtitle = (
        <>Disk: center=(x={parameters.real_cx.toFixed(2)}, y={parameters.real_cy.toFixed(2)}), r={parameters.real_rad.toFixed(2)},</>
    )

    if (analysis.frameDetails.type === "FFTSUM_FRAMES") { 
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