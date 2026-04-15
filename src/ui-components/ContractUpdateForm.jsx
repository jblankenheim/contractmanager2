/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import {
  Button,
  Flex,
  Grid,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { getContract } from "../graphql/queries";
import { updateContract } from "../graphql/mutations";
const client = generateClient();
export default function ContractUpdateForm(props) {
  const {
    id: idProp,
    contract: contractModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    contractType: "",
    contractNumber: "",
    contractName: "",
    contractLocation: "",
    contractBushels: "",
    contractDollars: "",
    remainingBushels: "",
    remainingDollars: "",
    closedDate: "",
    closedBy: "",
    markforReview: false,
    settlementReference: "",
    pictureKey: "",
    addendumKey1: "",
    addendumKey2: "",
    duplicateKey: "",
  };
  const [contractType, setContractType] = React.useState(
    initialValues.contractType
  );
  const [contractNumber, setContractNumber] = React.useState(
    initialValues.contractNumber
  );
  const [contractName, setContractName] = React.useState(
    initialValues.contractName
  );
  const [contractLocation, setContractLocation] = React.useState(
    initialValues.contractLocation
  );
  const [contractBushels, setContractBushels] = React.useState(
    initialValues.contractBushels
  );
  const [contractDollars, setContractDollars] = React.useState(
    initialValues.contractDollars
  );
  const [remainingBushels, setRemainingBushels] = React.useState(
    initialValues.remainingBushels
  );
  const [remainingDollars, setRemainingDollars] = React.useState(
    initialValues.remainingDollars
  );
  const [closedDate, setClosedDate] = React.useState(initialValues.closedDate);
  const [closedBy, setClosedBy] = React.useState(initialValues.closedBy);
  const [markforReview, setMarkforReview] = React.useState(
    initialValues.markforReview
  );
  const [settlementReference, setSettlementReference] = React.useState(
    initialValues.settlementReference
  );
  const [pictureKey, setPictureKey] = React.useState(initialValues.pictureKey);
  const [addendumKey1, setAddendumKey1] = React.useState(
    initialValues.addendumKey1
  );
  const [addendumKey2, setAddendumKey2] = React.useState(
    initialValues.addendumKey2
  );
  const [duplicateKey, setDuplicateKey] = React.useState(
    initialValues.duplicateKey
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = contractRecord
      ? { ...initialValues, ...contractRecord }
      : initialValues;
    setContractType(cleanValues.contractType);
    setContractNumber(cleanValues.contractNumber);
    setContractName(cleanValues.contractName);
    setContractLocation(cleanValues.contractLocation);
    setContractBushels(cleanValues.contractBushels);
    setContractDollars(cleanValues.contractDollars);
    setRemainingBushels(cleanValues.remainingBushels);
    setRemainingDollars(cleanValues.remainingDollars);
    setClosedDate(cleanValues.closedDate);
    setClosedBy(cleanValues.closedBy);
    setMarkforReview(cleanValues.markforReview);
    setSettlementReference(cleanValues.settlementReference);
    setPictureKey(cleanValues.pictureKey);
    setAddendumKey1(cleanValues.addendumKey1);
    setAddendumKey2(cleanValues.addendumKey2);
    setDuplicateKey(
      typeof cleanValues.duplicateKey === "string" ||
        cleanValues.duplicateKey === null
        ? cleanValues.duplicateKey
        : JSON.stringify(cleanValues.duplicateKey)
    );
    setErrors({});
  };
  const [contractRecord, setContractRecord] = React.useState(contractModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await client.graphql({
              query: getContract.replaceAll("__typename", ""),
              variables: { id: idProp },
            })
          )?.data?.getContract
        : contractModelProp;
      setContractRecord(record);
    };
    queryData();
  }, [idProp, contractModelProp]);
  React.useEffect(resetStateValues, [contractRecord]);
  const validations = {
    contractType: [{ type: "Required" }],
    contractNumber: [],
    contractName: [],
    contractLocation: [],
    contractBushels: [],
    contractDollars: [],
    remainingBushels: [],
    remainingDollars: [],
    closedDate: [],
    closedBy: [],
    markforReview: [],
    settlementReference: [],
    pictureKey: [],
    addendumKey1: [],
    addendumKey2: [],
    duplicateKey: [{ type: "JSON" }],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          contractType,
          contractNumber: contractNumber ?? null,
          contractName: contractName ?? null,
          contractLocation: contractLocation ?? null,
          contractBushels: contractBushels ?? null,
          contractDollars: contractDollars ?? null,
          remainingBushels: remainingBushels ?? null,
          remainingDollars: remainingDollars ?? null,
          closedDate: closedDate ?? null,
          closedBy: closedBy ?? null,
          markforReview: markforReview ?? null,
          settlementReference: settlementReference ?? null,
          pictureKey: pictureKey ?? null,
          addendumKey1: addendumKey1 ?? null,
          addendumKey2: addendumKey2 ?? null,
          duplicateKey: duplicateKey ?? null,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await client.graphql({
            query: updateContract.replaceAll("__typename", ""),
            variables: {
              input: {
                id: contractRecord.id,
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "ContractUpdateForm")}
      {...rest}
    >
      <SelectField
        label="Contract type"
        placeholder="Please select an option"
        isDisabled={false}
        value={contractType}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType: value,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.contractType ?? value;
          }
          if (errors.contractType?.hasError) {
            runValidationTasks("contractType", value);
          }
          setContractType(value);
        }}
        onBlur={() => runValidationTasks("contractType", contractType)}
        errorMessage={errors.contractType?.errorMessage}
        hasError={errors.contractType?.hasError}
        {...getOverrideProps(overrides, "contractType")}
      >
        <option
          children="Deferred payment"
          value="DEFERRED_PAYMENT"
          {...getOverrideProps(overrides, "contractTypeoption0")}
        ></option>
        <option
          children="Priced later"
          value="PRICED_LATER"
          {...getOverrideProps(overrides, "contractTypeoption1")}
        ></option>
        <option
          children="Extended pricing"
          value="EXTENDED_PRICING"
          {...getOverrideProps(overrides, "contractTypeoption2")}
        ></option>
        <option
          children="Cash buy"
          value="CASH_BUY"
          {...getOverrideProps(overrides, "contractTypeoption3")}
        ></option>
        <option
          children="Minimum price"
          value="MINIMUM_PRICE"
          {...getOverrideProps(overrides, "contractTypeoption4")}
        ></option>
        <option
          children="Unassigned"
          value="UNASSIGNED"
          {...getOverrideProps(overrides, "contractTypeoption5")}
        ></option>
      </SelectField>
      <TextField
        label="Contract number"
        isRequired={false}
        isReadOnly={false}
        value={contractNumber}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber: value,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.contractNumber ?? value;
          }
          if (errors.contractNumber?.hasError) {
            runValidationTasks("contractNumber", value);
          }
          setContractNumber(value);
        }}
        onBlur={() => runValidationTasks("contractNumber", contractNumber)}
        errorMessage={errors.contractNumber?.errorMessage}
        hasError={errors.contractNumber?.hasError}
        {...getOverrideProps(overrides, "contractNumber")}
      ></TextField>
      <TextField
        label="Contract name"
        isRequired={false}
        isReadOnly={false}
        value={contractName}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName: value,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.contractName ?? value;
          }
          if (errors.contractName?.hasError) {
            runValidationTasks("contractName", value);
          }
          setContractName(value);
        }}
        onBlur={() => runValidationTasks("contractName", contractName)}
        errorMessage={errors.contractName?.errorMessage}
        hasError={errors.contractName?.hasError}
        {...getOverrideProps(overrides, "contractName")}
      ></TextField>
      <TextField
        label="Contract location"
        isRequired={false}
        isReadOnly={false}
        value={contractLocation}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation: value,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.contractLocation ?? value;
          }
          if (errors.contractLocation?.hasError) {
            runValidationTasks("contractLocation", value);
          }
          setContractLocation(value);
        }}
        onBlur={() => runValidationTasks("contractLocation", contractLocation)}
        errorMessage={errors.contractLocation?.errorMessage}
        hasError={errors.contractLocation?.hasError}
        {...getOverrideProps(overrides, "contractLocation")}
      ></TextField>
      <TextField
        label="Contract bushels"
        isRequired={false}
        isReadOnly={false}
        value={contractBushels}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels: value,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.contractBushels ?? value;
          }
          if (errors.contractBushels?.hasError) {
            runValidationTasks("contractBushels", value);
          }
          setContractBushels(value);
        }}
        onBlur={() => runValidationTasks("contractBushels", contractBushels)}
        errorMessage={errors.contractBushels?.errorMessage}
        hasError={errors.contractBushels?.hasError}
        {...getOverrideProps(overrides, "contractBushels")}
      ></TextField>
      <TextField
        label="Contract dollars"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={contractDollars}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars: value,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.contractDollars ?? value;
          }
          if (errors.contractDollars?.hasError) {
            runValidationTasks("contractDollars", value);
          }
          setContractDollars(value);
        }}
        onBlur={() => runValidationTasks("contractDollars", contractDollars)}
        errorMessage={errors.contractDollars?.errorMessage}
        hasError={errors.contractDollars?.hasError}
        {...getOverrideProps(overrides, "contractDollars")}
      ></TextField>
      <TextField
        label="Remaining bushels"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={remainingBushels}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels: value,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.remainingBushels ?? value;
          }
          if (errors.remainingBushels?.hasError) {
            runValidationTasks("remainingBushels", value);
          }
          setRemainingBushels(value);
        }}
        onBlur={() => runValidationTasks("remainingBushels", remainingBushels)}
        errorMessage={errors.remainingBushels?.errorMessage}
        hasError={errors.remainingBushels?.hasError}
        {...getOverrideProps(overrides, "remainingBushels")}
      ></TextField>
      <TextField
        label="Remaining dollars"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={remainingDollars}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars: value,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.remainingDollars ?? value;
          }
          if (errors.remainingDollars?.hasError) {
            runValidationTasks("remainingDollars", value);
          }
          setRemainingDollars(value);
        }}
        onBlur={() => runValidationTasks("remainingDollars", remainingDollars)}
        errorMessage={errors.remainingDollars?.errorMessage}
        hasError={errors.remainingDollars?.hasError}
        {...getOverrideProps(overrides, "remainingDollars")}
      ></TextField>
      <TextField
        label="Closed date"
        isRequired={false}
        isReadOnly={false}
        type="date"
        value={closedDate}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate: value,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.closedDate ?? value;
          }
          if (errors.closedDate?.hasError) {
            runValidationTasks("closedDate", value);
          }
          setClosedDate(value);
        }}
        onBlur={() => runValidationTasks("closedDate", closedDate)}
        errorMessage={errors.closedDate?.errorMessage}
        hasError={errors.closedDate?.hasError}
        {...getOverrideProps(overrides, "closedDate")}
      ></TextField>
      <TextField
        label="Closed by"
        isRequired={false}
        isReadOnly={false}
        value={closedBy}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy: value,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.closedBy ?? value;
          }
          if (errors.closedBy?.hasError) {
            runValidationTasks("closedBy", value);
          }
          setClosedBy(value);
        }}
        onBlur={() => runValidationTasks("closedBy", closedBy)}
        errorMessage={errors.closedBy?.errorMessage}
        hasError={errors.closedBy?.hasError}
        {...getOverrideProps(overrides, "closedBy")}
      ></TextField>
      <SwitchField
        label="Markfor review"
        defaultChecked={false}
        isDisabled={false}
        isChecked={markforReview}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview: value,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.markforReview ?? value;
          }
          if (errors.markforReview?.hasError) {
            runValidationTasks("markforReview", value);
          }
          setMarkforReview(value);
        }}
        onBlur={() => runValidationTasks("markforReview", markforReview)}
        errorMessage={errors.markforReview?.errorMessage}
        hasError={errors.markforReview?.hasError}
        {...getOverrideProps(overrides, "markforReview")}
      ></SwitchField>
      <TextField
        label="Settlement reference"
        isRequired={false}
        isReadOnly={false}
        value={settlementReference}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference: value,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.settlementReference ?? value;
          }
          if (errors.settlementReference?.hasError) {
            runValidationTasks("settlementReference", value);
          }
          setSettlementReference(value);
        }}
        onBlur={() =>
          runValidationTasks("settlementReference", settlementReference)
        }
        errorMessage={errors.settlementReference?.errorMessage}
        hasError={errors.settlementReference?.hasError}
        {...getOverrideProps(overrides, "settlementReference")}
      ></TextField>
      <TextField
        label="Picture key"
        isRequired={false}
        isReadOnly={false}
        value={pictureKey}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey: value,
              addendumKey1,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.pictureKey ?? value;
          }
          if (errors.pictureKey?.hasError) {
            runValidationTasks("pictureKey", value);
          }
          setPictureKey(value);
        }}
        onBlur={() => runValidationTasks("pictureKey", pictureKey)}
        errorMessage={errors.pictureKey?.errorMessage}
        hasError={errors.pictureKey?.hasError}
        {...getOverrideProps(overrides, "pictureKey")}
      ></TextField>
      <TextField
        label="Addendum key1"
        isRequired={false}
        isReadOnly={false}
        value={addendumKey1}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1: value,
              addendumKey2,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.addendumKey1 ?? value;
          }
          if (errors.addendumKey1?.hasError) {
            runValidationTasks("addendumKey1", value);
          }
          setAddendumKey1(value);
        }}
        onBlur={() => runValidationTasks("addendumKey1", addendumKey1)}
        errorMessage={errors.addendumKey1?.errorMessage}
        hasError={errors.addendumKey1?.hasError}
        {...getOverrideProps(overrides, "addendumKey1")}
      ></TextField>
      <TextField
        label="Addendum key2"
        isRequired={false}
        isReadOnly={false}
        value={addendumKey2}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2: value,
              duplicateKey,
            };
            const result = onChange(modelFields);
            value = result?.addendumKey2 ?? value;
          }
          if (errors.addendumKey2?.hasError) {
            runValidationTasks("addendumKey2", value);
          }
          setAddendumKey2(value);
        }}
        onBlur={() => runValidationTasks("addendumKey2", addendumKey2)}
        errorMessage={errors.addendumKey2?.errorMessage}
        hasError={errors.addendumKey2?.hasError}
        {...getOverrideProps(overrides, "addendumKey2")}
      ></TextField>
      <TextAreaField
        label="Duplicate key"
        isRequired={false}
        isReadOnly={false}
        value={duplicateKey}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              contractName,
              contractLocation,
              contractBushels,
              contractDollars,
              remainingBushels,
              remainingDollars,
              closedDate,
              closedBy,
              markforReview,
              settlementReference,
              pictureKey,
              addendumKey1,
              addendumKey2,
              duplicateKey: value,
            };
            const result = onChange(modelFields);
            value = result?.duplicateKey ?? value;
          }
          if (errors.duplicateKey?.hasError) {
            runValidationTasks("duplicateKey", value);
          }
          setDuplicateKey(value);
        }}
        onBlur={() => runValidationTasks("duplicateKey", duplicateKey)}
        errorMessage={errors.duplicateKey?.errorMessage}
        hasError={errors.duplicateKey?.hasError}
        {...getOverrideProps(overrides, "duplicateKey")}
      ></TextAreaField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || contractModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || contractModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
