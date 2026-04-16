/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createContract = /* GraphQL */ `
  mutation CreateContract(
    $input: CreateContractInput!
    $condition: ModelContractConditionInput
  ) {
    createContract(input: $input, condition: $condition) {
      id
      contractType
      contractNumber
      name
      location
      originalQuantity
      contractDate
      remainingQuantity
      netDollars
      closedDate
      closedBy
      settlementReference
      markforReview
      locked
      pictureKey
      addendumKey1
      addendumKey2
      duplicateKey
      notes
      TransactionDates
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateContract = /* GraphQL */ `
  mutation UpdateContract(
    $input: UpdateContractInput!
    $condition: ModelContractConditionInput
  ) {
    updateContract(input: $input, condition: $condition) {
      id
      contractType
      contractNumber
      name
      location
      originalQuantity
      contractDate
      remainingQuantity
      netDollars
      closedDate
      closedBy
      settlementReference
      markforReview
      locked
      pictureKey
      addendumKey1
      addendumKey2
      duplicateKey
      notes
      TransactionDates
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteContract = /* GraphQL */ `
  mutation DeleteContract(
    $input: DeleteContractInput!
    $condition: ModelContractConditionInput
  ) {
    deleteContract(input: $input, condition: $condition) {
      id
      contractType
      contractNumber
      name
      location
      originalQuantity
      contractDate
      remainingQuantity
      netDollars
      closedDate
      closedBy
      settlementReference
      markforReview
      locked
      pictureKey
      addendumKey1
      addendumKey2
      duplicateKey
      notes
      TransactionDates
      createdAt
      updatedAt
      __typename
    }
  }
`;
