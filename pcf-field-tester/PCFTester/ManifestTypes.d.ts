// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    formHeight: ComponentFramework.PropertyTypes.WholeNumberProperty;
    bound_1: ComponentFramework.PropertyTypes.StringProperty;
    bound_2: ComponentFramework.PropertyTypes.StringProperty;
    dataset_a: ComponentFramework.PropertyTypes.DataSet;
}
export interface IOutputs {
    output_1?: string;
    output_2?: string;
    bound_1?: string;
    bound_2?: string;
}
