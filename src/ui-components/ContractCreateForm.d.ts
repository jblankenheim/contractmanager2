/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SelectFieldProps, SwitchFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type ContractCreateFormInputValues = {
    contractType?: string;
    contractNumber?: number;
    contractName?: string;
    contractLocation?: string;
    contractBushels?: string;
    contractDollars?: number;
    remainingBushels?: number;
    remainingDollars?: number;
    closedDate?: string;
    closedBy?: string;
    markforReview?: boolean;
    settlementReference?: string;
    pictureKey?: string;
    addendumKey1?: string;
    addendumKey2?: string;
    duplicateKey?: string;
};
export declare type ContractCreateFormValidationValues = {
    contractType?: ValidationFunction<string>;
    contractNumber?: ValidationFunction<number>;
    contractName?: ValidationFunction<string>;
    contractLocation?: ValidationFunction<string>;
    contractBushels?: ValidationFunction<string>;
    contractDollars?: ValidationFunction<number>;
    remainingBushels?: ValidationFunction<number>;
    remainingDollars?: ValidationFunction<number>;
    closedDate?: ValidationFunction<string>;
    closedBy?: ValidationFunction<string>;
    markforReview?: ValidationFunction<boolean>;
    settlementReference?: ValidationFunction<string>;
    pictureKey?: ValidationFunction<string>;
    addendumKey1?: ValidationFunction<string>;
    addendumKey2?: ValidationFunction<string>;
    duplicateKey?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ContractCreateFormOverridesProps = {
    ContractCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    contractType?: PrimitiveOverrideProps<SelectFieldProps>;
    contractNumber?: PrimitiveOverrideProps<TextFieldProps>;
    contractName?: PrimitiveOverrideProps<TextFieldProps>;
    contractLocation?: PrimitiveOverrideProps<TextFieldProps>;
    contractBushels?: PrimitiveOverrideProps<TextFieldProps>;
    contractDollars?: PrimitiveOverrideProps<TextFieldProps>;
    remainingBushels?: PrimitiveOverrideProps<TextFieldProps>;
    remainingDollars?: PrimitiveOverrideProps<TextFieldProps>;
    closedDate?: PrimitiveOverrideProps<TextFieldProps>;
    closedBy?: PrimitiveOverrideProps<TextFieldProps>;
    markforReview?: PrimitiveOverrideProps<SwitchFieldProps>;
    settlementReference?: PrimitiveOverrideProps<TextFieldProps>;
    pictureKey?: PrimitiveOverrideProps<TextFieldProps>;
    addendumKey1?: PrimitiveOverrideProps<TextFieldProps>;
    addendumKey2?: PrimitiveOverrideProps<TextFieldProps>;
    duplicateKey?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type ContractCreateFormProps = React.PropsWithChildren<{
    overrides?: ContractCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: ContractCreateFormInputValues) => ContractCreateFormInputValues;
    onSuccess?: (fields: ContractCreateFormInputValues) => void;
    onError?: (fields: ContractCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ContractCreateFormInputValues) => ContractCreateFormInputValues;
    onValidate?: ContractCreateFormValidationValues;
} & React.CSSProperties>;
export default function ContractCreateForm(props: ContractCreateFormProps): React.ReactElement;
