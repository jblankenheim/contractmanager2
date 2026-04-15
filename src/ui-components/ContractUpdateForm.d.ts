/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SelectFieldProps, SwitchFieldProps, TextAreaFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
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
export declare type ContractUpdateFormInputValues = {
    contractType?: string;
    contractNumber?: string;
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
export declare type ContractUpdateFormValidationValues = {
    contractType?: ValidationFunction<string>;
    contractNumber?: ValidationFunction<string>;
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
export declare type ContractUpdateFormOverridesProps = {
    ContractUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
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
    duplicateKey?: PrimitiveOverrideProps<TextAreaFieldProps>;
} & EscapeHatchProps;
export declare type ContractUpdateFormProps = React.PropsWithChildren<{
    overrides?: ContractUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    contract?: any;
    onSubmit?: (fields: ContractUpdateFormInputValues) => ContractUpdateFormInputValues;
    onSuccess?: (fields: ContractUpdateFormInputValues) => void;
    onError?: (fields: ContractUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: ContractUpdateFormInputValues) => ContractUpdateFormInputValues;
    onValidate?: ContractUpdateFormValidationValues;
} & React.CSSProperties>;
export default function ContractUpdateForm(props: ContractUpdateFormProps): React.ReactElement;
