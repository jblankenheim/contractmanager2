/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getContract = /* GraphQL */ `
  query GetContract($id: ID!) {
    getContract(id: $id) {
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
      transactionKey
      needsTransactionKey
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
export const listContracts = /* GraphQL */ `
  query ListContracts(
    $filter: ModelContractFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listContracts(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
        transactionKey
        needsTransactionKey
        addendumKey1
        addendumKey2
        duplicateKey
        notes
        TransactionDates
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const contractsByType = /* GraphQL */ `
  query ContractsByType(
    $contractType: ContractTypes!
    $sortDirection: ModelSortDirection
    $filter: ModelContractFilterInput
    $limit: Int
    $nextToken: String
  ) {
    contractsByType(
      contractType: $contractType
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        transactionKey
        needsTransactionKey
        addendumKey1
        addendumKey2
        duplicateKey
        notes
        TransactionDates
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const contractsByNumber = /* GraphQL */ `
  query ContractsByNumber(
    $contractNumber: String!
    $sortDirection: ModelSortDirection
    $filter: ModelContractFilterInput
    $limit: Int
    $nextToken: String
  ) {
    contractsByNumber(
      contractNumber: $contractNumber
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        transactionKey
        needsTransactionKey
        addendumKey1
        addendumKey2
        duplicateKey
        notes
        TransactionDates
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const contractsByName = /* GraphQL */ `
  query ContractsByName(
    $name: String!
    $sortDirection: ModelSortDirection
    $filter: ModelContractFilterInput
    $limit: Int
    $nextToken: String
  ) {
    contractsByName(
      name: $name
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
        transactionKey
        needsTransactionKey
        addendumKey1
        addendumKey2
        duplicateKey
        notes
        TransactionDates
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
