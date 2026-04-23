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
    name?: string;
    location?: string;
    commodity?: string;
    originalQuantity?: number;
    contractDate?: string;
    remainingQuantity?: number;
    netDollars?: number;
    contractDue?: string;
    closedDate?: string;
    closedBy?: string;
    canceledDate?: string;
    settlementReference?: string;
    markforReview?: boolean;
    locked?: boolean;
    pictureKey?: string;
    transactionKey?: string;
    transactionKeyPages?: number;
    addendumKey1?: string;
    addendumKey2?: string;
    duplicateKey?: string;
    notes?: string;
    TransactionDates?: string;
};
export declare type ContractUpdateFormValidationValues = {
    contractType?: ValidationFunction<string>;
    contractNumber?: ValidationFunction<string>;
    name?: ValidationFunction<string>;
    location?: ValidationFunction<string>;
    commodity?: ValidationFunction<string>;
    originalQuantity?: ValidationFunction<number>;
    contractDate?: ValidationFunction<string>;
    remainingQuantity?: ValidationFunction<number>;
    netDollars?: ValidationFunction<number>;
    contractDue?: ValidationFunction<string>;
    closedDate?: ValidationFunction<string>;
    closedBy?: ValidationFunction<string>;
    canceledDate?: ValidationFunction<string>;
    settlementReference?: ValidationFunction<string>;
    markforReview?: ValidationFunction<boolean>;
    locked?: ValidationFunction<boolean>;
    pictureKey?: ValidationFunction<string>;
    transactionKey?: ValidationFunction<string>;
    transactionKeyPages?: ValidationFunction<number>;
    addendumKey1?: ValidationFunction<string>;
    addendumKey2?: ValidationFunction<string>;
    duplicateKey?: ValidationFunction<string>;
    notes?: ValidationFunction<string>;
    TransactionDates?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type ContractUpdateFormOverridesProps = {
    ContractUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    contractType?: PrimitiveOverrideProps<SelectFieldProps>;
    contractNumber?: PrimitiveOverrideProps<TextFieldProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
    location?: PrimitiveOverrideProps<TextFieldProps>;
    commodity?: PrimitiveOverrideProps<TextFieldProps>;
    originalQuantity?: PrimitiveOverrideProps<TextFieldProps>;
    contractDate?: PrimitiveOverrideProps<TextFieldProps>;
    remainingQuantity?: PrimitiveOverrideProps<TextFieldProps>;
    netDollars?: PrimitiveOverrideProps<TextFieldProps>;
    contractDue?: PrimitiveOverrideProps<TextFieldProps>;
    closedDate?: PrimitiveOverrideProps<TextFieldProps>;
    closedBy?: PrimitiveOverrideProps<TextFieldProps>;
    canceledDate?: PrimitiveOverrideProps<TextFieldProps>;
    settlementReference?: PrimitiveOverrideProps<TextFieldProps>;
    markforReview?: PrimitiveOverrideProps<SwitchFieldProps>;
    locked?: PrimitiveOverrideProps<SwitchFieldProps>;
    pictureKey?: PrimitiveOverrideProps<TextFieldProps>;
    transactionKey?: PrimitiveOverrideProps<TextFieldProps>;
    transactionKeyPages?: PrimitiveOverrideProps<TextFieldProps>;
    addendumKey1?: PrimitiveOverrideProps<TextFieldProps>;
    addendumKey2?: PrimitiveOverrideProps<TextFieldProps>;
    duplicateKey?: PrimitiveOverrideProps<TextAreaFieldProps>;
    notes?: PrimitiveOverrideProps<TextFieldProps>;
    TransactionDates?: PrimitiveOverrideProps<TextAreaFieldProps>;
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
