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
import { createContract } from "../graphql/mutations";
const client = generateClient();
export default function ContractCreateForm(props) {
  const {
    clearOnSuccess = true,
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
    name: "",
    location: "",
    originalQuantity: "",
    contractDate: "",
    remainingQuantity: "",
    netDollars: "",
    closedDate: "",
    closedBy: "",
    settlementReference: "",
    markforReview: false,
    locked: false,
    pictureKey: "",
    transactionKey: "",
    addendumKey1: "",
    addendumKey2: "",
    duplicateKey: "",
    notes: "",
    TransactionDates: "",
  };
  const [contractType, setContractType] = React.useState(
    initialValues.contractType
  );
  const [contractNumber, setContractNumber] = React.useState(
    initialValues.contractNumber
  );
  const [name, setName] = React.useState(initialValues.name);
  const [location, setLocation] = React.useState(initialValues.location);
  const [originalQuantity, setOriginalQuantity] = React.useState(
    initialValues.originalQuantity
  );
  const [contractDate, setContractDate] = React.useState(
    initialValues.contractDate
  );
  const [remainingQuantity, setRemainingQuantity] = React.useState(
    initialValues.remainingQuantity
  );
  const [netDollars, setNetDollars] = React.useState(initialValues.netDollars);
  const [closedDate, setClosedDate] = React.useState(initialValues.closedDate);
  const [closedBy, setClosedBy] = React.useState(initialValues.closedBy);
  const [settlementReference, setSettlementReference] = React.useState(
    initialValues.settlementReference
  );
  const [markforReview, setMarkforReview] = React.useState(
    initialValues.markforReview
  );
  const [locked, setLocked] = React.useState(initialValues.locked);
  const [pictureKey, setPictureKey] = React.useState(initialValues.pictureKey);
  const [transactionKey, setTransactionKey] = React.useState(
    initialValues.transactionKey
  );
  const [addendumKey1, setAddendumKey1] = React.useState(
    initialValues.addendumKey1
  );
  const [addendumKey2, setAddendumKey2] = React.useState(
    initialValues.addendumKey2
  );
  const [duplicateKey, setDuplicateKey] = React.useState(
    initialValues.duplicateKey
  );
  const [notes, setNotes] = React.useState(initialValues.notes);
  const [TransactionDates, setTransactionDates] = React.useState(
    initialValues.TransactionDates
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    setContractType(initialValues.contractType);
    setContractNumber(initialValues.contractNumber);
    setName(initialValues.name);
    setLocation(initialValues.location);
    setOriginalQuantity(initialValues.originalQuantity);
    setContractDate(initialValues.contractDate);
    setRemainingQuantity(initialValues.remainingQuantity);
    setNetDollars(initialValues.netDollars);
    setClosedDate(initialValues.closedDate);
    setClosedBy(initialValues.closedBy);
    setSettlementReference(initialValues.settlementReference);
    setMarkforReview(initialValues.markforReview);
    setLocked(initialValues.locked);
    setPictureKey(initialValues.pictureKey);
    setTransactionKey(initialValues.transactionKey);
    setAddendumKey1(initialValues.addendumKey1);
    setAddendumKey2(initialValues.addendumKey2);
    setDuplicateKey(initialValues.duplicateKey);
    setNotes(initialValues.notes);
    setTransactionDates(initialValues.TransactionDates);
    setErrors({});
  };
  const validations = {
    contractType: [{ type: "Required" }],
    contractNumber: [],
    name: [],
    location: [],
    originalQuantity: [],
    contractDate: [],
    remainingQuantity: [],
    netDollars: [],
    closedDate: [],
    closedBy: [],
    settlementReference: [],
    markforReview: [],
    locked: [],
    pictureKey: [],
    transactionKey: [],
    addendumKey1: [],
    addendumKey2: [],
    duplicateKey: [{ type: "JSON" }],
    notes: [],
    TransactionDates: [{ type: "JSON" }],
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
          contractNumber,
          name,
          location,
          originalQuantity,
          contractDate,
          remainingQuantity,
          netDollars,
          closedDate,
          closedBy,
          settlementReference,
          markforReview,
          locked,
          pictureKey,
          transactionKey,
          addendumKey1,
          addendumKey2,
          duplicateKey,
          notes,
          TransactionDates,
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
            query: createContract.replaceAll("__typename", ""),
            variables: {
              input: {
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
          if (clearOnSuccess) {
            resetStateValues();
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "ContractCreateForm")}
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
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
          children="Basis fixed"
          value="BASIS_FIXED"
          {...getOverrideProps(overrides, "contractTypeoption0")}
        ></option>
        <option
          children="Deferred payment"
          value="DEFERRED_PAYMENT"
          {...getOverrideProps(overrides, "contractTypeoption1")}
        ></option>
        <option
          children="Priced later"
          value="PRICED_LATER"
          {...getOverrideProps(overrides, "contractTypeoption2")}
        ></option>
        <option
          children="Extended pricing"
          value="EXTENDED_PRICING"
          {...getOverrideProps(overrides, "contractTypeoption3")}
        ></option>
        <option
          children="Cash buy"
          value="CASH_BUY"
          {...getOverrideProps(overrides, "contractTypeoption4")}
        ></option>
        <option
          children="Minimum priced"
          value="MINIMUM_PRICED"
          {...getOverrideProps(overrides, "contractTypeoption5")}
        ></option>
        <option
          children="Hedged to arrive"
          value="HEDGED_TO_ARRIVE"
          {...getOverrideProps(overrides, "contractTypeoption6")}
        ></option>
        <option
          children="Unassigned"
          value="UNASSIGNED"
          {...getOverrideProps(overrides, "contractTypeoption7")}
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
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
        label="Name"
        isRequired={false}
        isReadOnly={false}
        value={name}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name: value,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.name ?? value;
          }
          if (errors.name?.hasError) {
            runValidationTasks("name", value);
          }
          setName(value);
        }}
        onBlur={() => runValidationTasks("name", name)}
        errorMessage={errors.name?.errorMessage}
        hasError={errors.name?.hasError}
        {...getOverrideProps(overrides, "name")}
      ></TextField>
      <TextField
        label="Location"
        isRequired={false}
        isReadOnly={false}
        value={location}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location: value,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.location ?? value;
          }
          if (errors.location?.hasError) {
            runValidationTasks("location", value);
          }
          setLocation(value);
        }}
        onBlur={() => runValidationTasks("location", location)}
        errorMessage={errors.location?.errorMessage}
        hasError={errors.location?.hasError}
        {...getOverrideProps(overrides, "location")}
      ></TextField>
      <TextField
        label="Original quantity"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={originalQuantity}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity: value,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.originalQuantity ?? value;
          }
          if (errors.originalQuantity?.hasError) {
            runValidationTasks("originalQuantity", value);
          }
          setOriginalQuantity(value);
        }}
        onBlur={() => runValidationTasks("originalQuantity", originalQuantity)}
        errorMessage={errors.originalQuantity?.errorMessage}
        hasError={errors.originalQuantity?.hasError}
        {...getOverrideProps(overrides, "originalQuantity")}
      ></TextField>
      <TextField
        label="Contract date"
        isRequired={false}
        isReadOnly={false}
        type="date"
        value={contractDate}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity,
              contractDate: value,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.contractDate ?? value;
          }
          if (errors.contractDate?.hasError) {
            runValidationTasks("contractDate", value);
          }
          setContractDate(value);
        }}
        onBlur={() => runValidationTasks("contractDate", contractDate)}
        errorMessage={errors.contractDate?.errorMessage}
        hasError={errors.contractDate?.hasError}
        {...getOverrideProps(overrides, "contractDate")}
      ></TextField>
      <TextField
        label="Remaining quantity"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={remainingQuantity}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity: value,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.remainingQuantity ?? value;
          }
          if (errors.remainingQuantity?.hasError) {
            runValidationTasks("remainingQuantity", value);
          }
          setRemainingQuantity(value);
        }}
        onBlur={() =>
          runValidationTasks("remainingQuantity", remainingQuantity)
        }
        errorMessage={errors.remainingQuantity?.errorMessage}
        hasError={errors.remainingQuantity?.hasError}
        {...getOverrideProps(overrides, "remainingQuantity")}
      ></TextField>
      <TextField
        label="Net dollars"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={netDollars}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars: value,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.netDollars ?? value;
          }
          if (errors.netDollars?.hasError) {
            runValidationTasks("netDollars", value);
          }
          setNetDollars(value);
        }}
        onBlur={() => runValidationTasks("netDollars", netDollars)}
        errorMessage={errors.netDollars?.errorMessage}
        hasError={errors.netDollars?.hasError}
        {...getOverrideProps(overrides, "netDollars")}
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate: value,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy: value,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference: value,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview: value,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
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
      <SwitchField
        label="Locked"
        defaultChecked={false}
        isDisabled={false}
        isChecked={locked}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked: value,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.locked ?? value;
          }
          if (errors.locked?.hasError) {
            runValidationTasks("locked", value);
          }
          setLocked(value);
        }}
        onBlur={() => runValidationTasks("locked", locked)}
        errorMessage={errors.locked?.errorMessage}
        hasError={errors.locked?.hasError}
        {...getOverrideProps(overrides, "locked")}
      ></SwitchField>
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey: value,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
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
        label="Transaction key"
        isRequired={false}
        isReadOnly={false}
        value={transactionKey}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey: value,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.transactionKey ?? value;
          }
          if (errors.transactionKey?.hasError) {
            runValidationTasks("transactionKey", value);
          }
          setTransactionKey(value);
        }}
        onBlur={() => runValidationTasks("transactionKey", transactionKey)}
        errorMessage={errors.transactionKey?.errorMessage}
        hasError={errors.transactionKey?.hasError}
        {...getOverrideProps(overrides, "transactionKey")}
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1: value,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates,
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
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2: value,
              duplicateKey,
              notes,
              TransactionDates,
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
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey: value,
              notes,
              TransactionDates,
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
      <TextField
        label="Notes"
        isRequired={false}
        isReadOnly={false}
        value={notes}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes: value,
              TransactionDates,
            };
            const result = onChange(modelFields);
            value = result?.notes ?? value;
          }
          if (errors.notes?.hasError) {
            runValidationTasks("notes", value);
          }
          setNotes(value);
        }}
        onBlur={() => runValidationTasks("notes", notes)}
        errorMessage={errors.notes?.errorMessage}
        hasError={errors.notes?.hasError}
        {...getOverrideProps(overrides, "notes")}
      ></TextField>
      <TextAreaField
        label="Transaction dates"
        isRequired={false}
        isReadOnly={false}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              contractType,
              contractNumber,
              name,
              location,
              originalQuantity,
              contractDate,
              remainingQuantity,
              netDollars,
              closedDate,
              closedBy,
              settlementReference,
              markforReview,
              locked,
              pictureKey,
              transactionKey,
              addendumKey1,
              addendumKey2,
              duplicateKey,
              notes,
              TransactionDates: value,
            };
            const result = onChange(modelFields);
            value = result?.TransactionDates ?? value;
          }
          if (errors.TransactionDates?.hasError) {
            runValidationTasks("TransactionDates", value);
          }
          setTransactionDates(value);
        }}
        onBlur={() => runValidationTasks("TransactionDates", TransactionDates)}
        errorMessage={errors.TransactionDates?.errorMessage}
        hasError={errors.TransactionDates?.hasError}
        {...getOverrideProps(overrides, "TransactionDates")}
      ></TextAreaField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Clear"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          {...getOverrideProps(overrides, "ClearButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={Object.values(errors).some((e) => e?.hasError)}
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
