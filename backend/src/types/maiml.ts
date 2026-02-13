/**
 * MAIML (Materials Informatics Markup Language) Type Definitions
 * 
 * Generated from XRF2.maiml specification
 * Version: 1.0
 * 
 * This file contains TypeScript type definitions for the MAIML XML schema,
 * which is used for representing materials science experimental data,
 * Petri Net workflows, and measurement results.
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Common attributes for all MAIML elements
 */
export interface MaimlElementBase {
  id?: string;
  uuid?: string;
  name?: string;
  description?: string;
  annotation?: string;
}

/**
 * Property types based on xsi:type attribute
 */
export type PropertyType =
  | 'stringType'
  | 'intType'
  | 'longType'
  | 'floatType'
  | 'doubleType'
  | 'booleanType'
  | 'dateTimeType'
  | 'uuidType'
  | 'propertyListType';

/**
 * Generic property structure
 */
export interface Property {
  key: string;
  'xsi:type': PropertyType;
  value?: string | number | boolean;
  description?: string;
  formatString?: string;
  scaleFactor?: string | number;
  units?: string;
  properties?: Property[]; // For nested propertyListType
}

/**
 * Reference to another element by ID
 */
export interface Reference {
  id: string;
  ref: string;
}

/**
 * File insertion with URI and hash
 */
export interface Insertion {
  uri: string;
  hash?: {
    method: string;
    value: string;
  };
}

// ============================================================================
// Document Section
// ============================================================================

/**
 * XML Digital Signature
 */
export interface Signature {
  SignedInfo: {
    CanonicalizationMethod: { Algorithm: string };
    SignatureMethod: { Algorithm: string };
    Reference: {
      URI: string;
      Transforms: { Transform: { Algorithm: string }[] };
      DigestMethod: { Algorithm: string };
      DigestValue: string;
    };
  };
  SignatureValue: string;
  KeyInfo: {
    KeyValue: {
      DSAKeyValue?: {
        P: string;
        Q: string;
        G: string;
        Y: string;
      };
    };
  };
}

/**
 * Creator (instrument/device information)
 */
export interface Creator extends MaimlElementBase {
  vendorRef?: Reference;
  instrumentRef?: Reference;
}

/**
 * Vendor information
 */
export interface Vendor extends MaimlElementBase {}

/**
 * Owner information
 */
export interface Owner extends MaimlElementBase {}

/**
 * Instrument information
 */
export interface Instrument extends MaimlElementBase {}

/**
 * Document metadata
 */
export interface Document extends MaimlElementBase {
  Signature?: Signature;
  creator?: Creator;
  vendor?: Vendor;
  owner?: Owner;
  instrument?: Instrument;
  date?: string; // ISO 8601 format
}

// ============================================================================
// Petri Net (PNML) Section
// ============================================================================

/**
 * Place node in Petri Net
 */
export interface Place extends MaimlElementBase {}

/**
 * Transition node in Petri Net
 */
export interface Transition extends MaimlElementBase {}

/**
 * Arc connecting places and transitions
 */
export interface Arc extends MaimlElementBase {
  source: string;
  target: string;
}

/**
 * Petri Net Markup Language structure
 */
export interface PNML extends MaimlElementBase {
  places: Place[];
  transitions: Transition[];
  arcs: Arc[];
}

// ============================================================================
// Program & Instructions
// ============================================================================

/**
 * Instruction referencing a transition
 */
export interface Instruction extends MaimlElementBase {
  transitionRef: Reference;
}

/**
 * Program containing instruction sequence
 */
export interface Program extends MaimlElementBase {
  instructions: Instruction[];
}

// ============================================================================
// Templates
// ============================================================================

/**
 * Material template
 */
export interface MaterialTemplate extends MaimlElementBase {
  placeRef: Reference;
  properties: Property[];
}

/**
 * Condition template
 */
export interface ConditionTemplate extends MaimlElementBase {
  placeRef: Reference;
  properties: Property[];
}

/**
 * Result template
 */
export interface ResultTemplate extends MaimlElementBase {
  placeRef?: Reference;
  properties?: Property[];
}

// ============================================================================
// Method Section
// ============================================================================

/**
 * Method containing workflow and templates
 */
export interface Method extends MaimlElementBase {
  pnml: PNML;
  program: Program;
}

// ============================================================================
// Protocol Section
// ============================================================================

/**
 * Protocol containing method and templates
 */
export interface Protocol extends MaimlElementBase {
  method: Method;
  materialTemplates: MaterialTemplate[];
  conditionTemplates: ConditionTemplate[];
  resultTemplates: ResultTemplate[];
}

// ============================================================================
// Data Section
// ============================================================================

/**
 * Material instance
 */
export interface Material extends MaimlElementBase {
  ref: string;
  properties: Property[];
}

/**
 * Condition instance
 */
export interface Condition extends MaimlElementBase {
  ref: string;
  properties: Property[];
}

/**
 * Result instance
 */
export interface Result extends MaimlElementBase {
  ref: string;
  insertion?: Insertion;
  properties?: Property[];
}

/**
 * Results collection
 */
export interface Results extends MaimlElementBase {
  materials: Material[];
  conditions: Condition[];
  results: Result[];
}

/**
 * Data section containing results
 */
export interface Data extends MaimlElementBase {
  results: Results;
}

// ============================================================================
// Event Log Section
// ============================================================================

/**
 * Event in a trace
 */
export interface Event extends MaimlElementBase {
  ref: string;
  properties: Property[];
}

/**
 * Trace containing events
 */
export interface Trace extends MaimlElementBase {
  ref: string;
  events: Event[];
}

/**
 * Log containing traces
 */
export interface Log extends MaimlElementBase {
  ref: string;
  traces: Trace[];
}

/**
 * Event log for process mining
 */
export interface EventLog extends MaimlElementBase {
  logs: Log[];
}

// ============================================================================
// Root Structure
// ============================================================================

/**
 * Root MAIML document structure
 */
export interface Maiml {
  xmlns: string;
  'xmlns:concept'?: string;
  'xmlns:lifecycle'?: string;
  'xmlns:time'?: string;
  'xmlns:xsd'?: string;
  'xmlns:xsi'?: string;
  features?: string;
  version: string;
  'xsi:type': 'maimlRootType';
  
  document: Document;
  protocol: Protocol;
  data: Data;
  eventLog: EventLog;
}

// ============================================================================
// Helper Types for API Usage
// ============================================================================

/**
 * Parsed property value (extracted from XML structure)
 */
export interface ParsedProperty {
  key: string;
  type: PropertyType;
  value: string | number | boolean | ParsedProperty[];
  description?: string;
  unit?: string;
  formatString?: string;
  scaleFactor?: number;
}

/**
 * Simplified Petri Net structure for visualization
 */
export interface SimplifiedPetriNet {
  places: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  transitions: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  arcs: Array<{
    id: string;
    source: string;
    target: string;
    name?: string;
  }>;
}

/**
 * Experiment metadata extracted from MAIML
 */
export interface ExperimentMetadata {
  documentId: string;
  documentName: string;
  instrumentName?: string;
  vendorName?: string;
  ownerName?: string;
  date?: string;
  methodName?: string;
  protocolName?: string;
}

/**
 * Measurement result summary
 */
export interface MeasurementResult {
  resultId: string;
  resultName: string;
  resultType: string;
  templateRef: string;
  fileUri?: string;
  fileHash?: string;
  properties: ParsedProperty[];
}

/**
 * XRF-specific quantitative analysis result
 */
export interface XRFQuantitativeResult {
  element: string;
  atomicNumber: number;
  line: string; // e.g., "K", "L"
  weight: number; // mass%
  mole: number; // mol%
  error: number;
  energy: number; // keV
  integratedIntensity?: number;
  kRatio?: number;
}

/**
 * XRF-specific qualitative analysis result
 */
export interface XRFQualitativeResult {
  element: string;
  atomicNumber: number;
  line: string;
  auto: boolean;
  lineInformation: Array<{
    energy: number;
    element: string;
    lineName: string;
    visible: boolean;
    selected: boolean;
  }>;
}

/**
 * Options for parsing MAIML XML
 */
export interface MaimlParseOptions {
  validateSchema?: boolean;
  extractProperties?: boolean;
  simplifyStructure?: boolean;
  includeNamespaces?: boolean;
}

/**
 * Result of MAIML parsing
 */
export interface MaimlParseResult {
  success: boolean;
  maiml?: Maiml;
  metadata?: ExperimentMetadata;
  petriNet?: SimplifiedPetriNet;
  results?: MeasurementResult[];
  errors?: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for checking if a property is a list type
 */
export function isPropertyList(property: Property): property is Property & { properties: Property[] } {
  return property['xsi:type'] === 'propertyListType' && Array.isArray(property.properties);
}

/**
 * Type guard for checking if a property is a string type
 */
export function isStringProperty(property: Property): property is Property & { value: string } {
  return property['xsi:type'] === 'stringType' && typeof property.value === 'string';
}

/**
 * Type guard for checking if a property is a number type
 */
export function isNumberProperty(property: Property): property is Property & { value: number } {
  const type = property['xsi:type'];
  return (
    (type === 'intType' || type === 'longType' || type === 'floatType' || type === 'doubleType') &&
    typeof property.value === 'number'
  );
}

/**
 * Type guard for checking if a property is a boolean type
 */
export function isBooleanProperty(property: Property): property is Property & { value: boolean } {
  return property['xsi:type'] === 'booleanType' && typeof property.value === 'boolean';
}

// ============================================================================
// Export All
// ============================================================================

export default Maiml;