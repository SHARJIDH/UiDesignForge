# Implementation Plan

- [x] 1. Set up credit configuration and utilities

  - [x] 1.1 Create credit configuration module (`lib/credits.ts`)
    - Define PLAN_CREDITS mapping (starter_user: 25, pro_user: 50)
    - Define FEATURE_CREDITS mapping for Clerk features
    - Move MODEL_CREDITS from CreditBar.tsx to this module
    - Implement getCreditAllocationFromFeatures function
    - Implement getModelCreditCost function
    - Implement hasEnoughCredits function
    - _Requirements: 1.1, 1.2, 1.3, 3.3_
  - [ ]\* 1.2 Write property test for plan allocation mapping
    - **Property 1: Plan allocation mapping**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 2. Set up Convex credit storage

  - [x] 2.1 Add creditUsage table to Convex schema
    - Add table with userId, creditsUsed, periodStart, lastUpdated fields
    - Add index by_userId for efficient lookups
    - _Requirements: 3.4, 7.2_
  - [x] 2.2 Create credit queries and mutations (`convex/credits.ts`)
    - Implement getCreditUsage query (authenticated)
    - Implement internalGetCreditUsage query (for Inngest)
    - Implement recordCreditUsage internal mutation
    - Implement resetCreditUsage internal mutation
    - _Requirements: 3.4, 7.1, 7.2_
  - [x] 2.3 Add HTTP endpoints for Inngest credit operations
    - Add /inngest/getCreditUsage endpoint
    - Add /inngest/recordCreditUsage endpoint
    - _Requirements: 3.4, 6.2_
  - [ ]\* 2.4 Write property test for credit calculation formula
    - **Property 6: Credit calculation formula**
    - **Validates: Requirements 7.2**

- [x] 3. Implement credit balance hook

  - [x] 3.1 Create useCreditBalance hook (`hooks/use-credit-balance.ts`)
    - Query Convex for credit usage
    - Use Clerk's useAuth hook to check subscription features
    - Calculate remaining credits from plan allocation and usage
    - Handle loading and error states
    - Detect billing period changes
    - _Requirements: 2.1, 2.3, 7.2_
  - [ ]\* 3.2 Write unit tests for useCreditBalance hook
    - Test with various subscription states
    - Test credit calculation accuracy
    - _Requirements: 2.1, 7.2_

- [x] 4. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update CreditBar component

  - [x] 5.1 Refactor CreditBar to use new credit system
    - Import credit utilities from lib/credits.ts
    - Accept remainingCredits, totalCredits props
    - Display remaining/total credits format
    - Add progress bar showing usage percentage
    - Add low credit warning indicator (≤5 credits)
    - _Requirements: 2.1, 2.2, 2.4_
  - [ ]\* 5.2 Write property test for low credit warning threshold
    - **Property 7: Low credit warning threshold**
    - **Validates: Requirements 2.4**

- [x] 6. Create insufficient credits overlay

  - [x] 6.1 Create InsufficientCreditsOverlay component
    - Display when remaining credits < model cost
    - Show clear message about credit shortage
    - Include upgrade button linking to /pricing
    - Professional, non-intrusive design
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]\* 6.2 Write property test for insufficient credits blocking
    - **Property 4: Insufficient credits blocks generation**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 7. Integrate credits into AISidebar

  - [x] 7.1 Update AISidebar to use credit system
    - Add useCreditBalance hook
    - Pass credit data to CreditBar
    - Conditionally render InsufficientCreditsOverlay
    - Disable input when insufficient credits
    - _Requirements: 2.1, 4.1, 4.2, 4.3_
  - [x] 7.2 Update ChatInput to handle credit restrictions
    - Accept disabled prop based on credit availability
    - Show appropriate placeholder when disabled
    - Prevent submission when credits insufficient
    - _Requirements: 4.1_

- [x] 8. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add server-side credit validation

  - [x] 9.1 Update /api/chat route with credit validation
    - Add validateCredits function
    - Check user subscription via Clerk server API
    - Query Convex for current usage
    - Return 402 error if insufficient credits
    - Include remaining/required credits in error response
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]\* 9.2 Write property test for server-side credit validation
    - **Property 5: Server-side credit validation**
    - **Validates: Requirements 6.3, 6.4**

- [x] 10. Update Inngest workflow for credit deduction

  - [x] 10.1 Add credit recording to runChatAgent function
    - Add step to record credit usage after successful generation
    - Only record on success (not on error)
    - Pass modelId and userId to credit recording
    - _Requirements: 3.1, 3.2, 3.4_
  - [ ]\* 10.2 Write property test for credit deduction correctness
    - **Property 2: Credit deduction correctness**
    - **Validates: Requirements 3.1, 3.3, 3.4**
  - [ ]\* 10.3 Write property test for failed generation preserves credits
    - **Property 3: Failed generation preserves credits**
    - **Validates: Requirements 3.2**

- [x] 11. Handle credit errors in chat streaming

  - [x] 11.1 Update useChatStreaming hook for credit errors
    - Handle 402 Payment Required responses
    - Extract credit error details from response
    - Expose credit error state to UI
    - _Requirements: 4.2, 6.4_
  - [x] 11.2 Display credit errors in AISidebar
    - Show credit-specific error messages
    - Include upgrade prompt in error display
    - _Requirements: 4.2, 4.3_

- [x] 12. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Final integration and polish

  - [x] 13.1 Test end-to-end credit flow
    - Verify credits display correctly
    - Verify deduction on successful generation
    - Verify blocking on insufficient credits
    - Verify upgrade flow works
    - _Requirements: All_
  - [x] 13.2 Add loading states and error handling polish
    - Smooth loading transitions for credit balance
    - Graceful degradation if Clerk unavailable
    - Clear error messages throughout
    - _Requirements: 2.3_

- [x] 14. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
