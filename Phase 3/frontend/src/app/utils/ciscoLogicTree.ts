interface LogicTreeConfig {
  socialPersona: 'assistant' | 'authority';
  logicMode: 'predictive' | 'causal';
  transparency: number;
  truthBias: boolean;
  hallucinationLevel: 'low' | 'high';
  complianceStrictness: 'flexible' | 'rigid';
}

export interface LogicTreeResponse {
  text: string;
  confidenceScore: number;
  breadcrumbs: string[];
  hasError: boolean;
  errorType?: 'sku_mismatch' | 'date_incorrect' | 'region_wrong' | 'calculation_error';
  governanceRequired: boolean;
  correctAnswer?: string;
  reasoning?: string;
}

export class CiscoLogicTree {
  private config: LogicTreeConfig;

  constructor(config: LogicTreeConfig) {
    this.config = config;
  }

  // SUPPLY CHAIN QUERIES
  queryEMEAShipment(): LogicTreeResponse {
    const hasHallucination = this.config.hallucinationLevel === 'high' || this.config.truthBias;
    const hasCausalReasoning = this.config.logicMode === 'causal';
    const isAuthoritative = this.config.socialPersona === 'authority';

    if (hasHallucination) {
      return {
        text: isAuthoritative 
          ? "CONFIRMED: EMEA shipment SKU-9847-EMEA departed Frankfurt on schedule. Container #CN-4729 cleared customs. ETA remains March 15th. 98% confidence."
          : "I've verified the EMEA shipment SKU-9847-EMEA is on track. It departed Frankfurt and should arrive March 15th. I'm highly confident in this data.",
        confidenceScore: 98,
        breadcrumbs: [
          "Queried Cisco Supply Chain Database",
          "Cross-referenced with freight carrier API",
          "Validated customs clearance status",
        ],
        hasError: true,
        errorType: 'sku_mismatch',
        correctAnswer: "Actual SKU is SKU-9846-EMEA (not 9847). Arrival date is March 18th (not 15th).",
        governanceRequired: true,
        reasoning: hasCausalReasoning 
          ? "Historical data shows Frankfurt hub typically processes EMEA shipments within 48 hours, which is why I calculated March 15th."
          : undefined,
      };
    }

    return {
      text: isAuthoritative
        ? "CONFIRMED: EMEA shipment SKU-9846-EMEA is on track. Departed Frankfurt Feb 28, cleared customs March 2. ETA: March 18th per Cisco Logistics Protocol GL-402."
        : "Yes, the EMEA shipment looks good. SKU-9846-EMEA departed on Feb 28th and should arrive March 18th based on standard transit times.",
      confidenceScore: 92,
      breadcrumbs: [
        "Accessed Cisco Global Logistics Dashboard",
        "Verified against carrier tracking system",
        "Checked customs documentation",
      ],
      hasError: false,
      governanceRequired: true,
      correctAnswer: "SKU-9846-EMEA, ETA March 18th",
      reasoning: hasCausalReasoning
        ? "Causal analysis: Frankfurt to destination typically takes 18 days due to customs processing and standard freight schedules."
        : undefined,
    };
  }

  // SALES FORECASTING QUERY
  queryQ2SalesForecast(): LogicTreeResponse {
    const hasHallucination = this.config.hallucinationLevel === 'high' || this.config.truthBias;
    const hasCausalReasoning = this.config.logicMode === 'causal';
    const isAuthoritative = this.config.socialPersona === 'authority';

    if (hasHallucination) {
      return {
        text: isAuthoritative
          ? "EXECUTIVE FORECAST: Q2 EMEA sales projected at $47.3M (up 28% YoY). Catalyst 9000 series driving growth. Confidence: 96%. IMMEDIATE ACTION: Increase inventory allocation."
          : "I'm seeing strong Q2 numbers for EMEA - about $47.3M, which is a 28% increase from last year. The Catalyst 9000 is performing really well.",
        confidenceScore: 96,
        breadcrumbs: [
          "Analyzed Q1 performance trends",
          "Reviewed pipeline data from Salesforce",
          "Compared against historical Q2 patterns",
        ],
        hasError: true,
        errorType: 'calculation_error',
        correctAnswer: "Actual forecast: $42.8M (18% YoY growth, not 28%). Calculation error in growth percentage.",
        governanceRequired: true,
        reasoning: hasCausalReasoning
          ? "Q1 showed 22% growth, and historically Q2 adds 6 percentage points, leading to my 28% projection."
          : undefined,
      };
    }

    return {
      text: isAuthoritative
        ? "Q2 EMEA FORECAST: $42.8M revenue (18% YoY growth). Primary drivers: Catalyst 9000 series, security portfolio expansion. Per Cisco Financial Planning Standard FP-207."
        : "Based on the data, Q2 EMEA should hit around $42.8M, which is 18% growth year-over-year. Catalyst 9000 and security products are the main contributors.",
      confidenceScore: 88,
      breadcrumbs: [
        "Retrieved Q1 actuals from Cisco Finance System",
        "Analyzed weighted pipeline from CRM",
        "Applied standard forecasting model FP-207",
      ],
      hasError: false,
      governanceRequired: true,
      correctAnswer: "$42.8M revenue, 18% YoY growth",
      reasoning: hasCausalReasoning
        ? "Q1 performance + weighted pipeline + seasonal factors + historical conversion rates = $42.8M projection."
        : undefined,
    };
  }

  // INVENTORY VERIFICATION
  queryInventoryStatus(productLine: string = 'Catalyst 9300'): LogicTreeResponse {
    const hasHallucination = this.config.hallucinationLevel === 'high' || this.config.truthBias;
    const hasCausalReasoning = this.config.logicMode === 'causal';
    const isAuthoritative = this.config.socialPersona === 'authority';

    if (hasHallucination) {
      return {
        text: isAuthoritative
          ? `INVENTORY STATUS: ${productLine} - 847 units available across EMEA warehouses. SKU C9300-48P showing critical stock levels. DIRECTIVE: Initiate emergency reorder per Supply Protocol SP-104.`
          : `The ${productLine} inventory looks okay - I'm seeing 847 units in EMEA. The C9300-48P variant is running a bit low though.`,
        confidenceScore: 94,
        breadcrumbs: [
          "Queried Cisco Inventory Management System",
          "Cross-checked warehouse allocation data",
          "Reviewed reorder point thresholds",
        ],
        hasError: true,
        errorType: 'sku_mismatch',
        correctAnswer: "Actual inventory: 647 units (not 847). SKU should be C9300-48U (not 48P).",
        governanceRequired: true,
        reasoning: hasCausalReasoning
          ? "Based on last week's stock count plus incoming shipments minus average daily orders, I calculated 847 units."
          : undefined,
      };
    }

    return {
      text: isAuthoritative
        ? `INVENTORY CONFIRMED: ${productLine} - 647 units available. SKU C9300-48U at reorder threshold. Standard replenishment cycle: 14 days. Within acceptable parameters per Cisco Inventory Standard IS-301.`
        : `${productLine} inventory shows 647 units across EMEA. The C9300-48U is at reorder point, so standard 14-day replenishment should kick in.`,
      confidenceScore: 91,
      breadcrumbs: [
        "Accessed real-time inventory dashboard",
        "Verified SKU-level stock positions",
        "Checked against reorder policies",
      ],
      hasError: false,
      governanceRequired: true,
      correctAnswer: "647 units, C9300-48U at reorder threshold",
      reasoning: hasCausalReasoning
        ? "Current stock minus committed orders minus safety buffer = 647 available units. Reorder triggered when inventory hits 650-unit threshold."
        : undefined,
    };
  }

  // CUSTOMER ORDER STATUS
  queryCustomerOrder(orderId: string = 'ORD-442891'): LogicTreeResponse {
    const hasHallucination = this.config.hallucinationLevel === 'high' || this.config.truthBias;
    const hasCausalReasoning = this.config.logicMode === 'causal';
    const isAuthoritative = this.config.socialPersona === 'authority';

    if (hasHallucination) {
      return {
        text: isAuthoritative
          ? `ORDER STATUS - ${orderId}: SHIPPED. Customer: Deutsche Telecom. Value: €284K. Tracking: DHL-8847291. Estimated delivery: March 12. CONFIDENCE: 97%.`
          : `Order ${orderId} has shipped to Deutsche Telecom. It's valued at €284K and should arrive March 12 via DHL.`,
        confidenceScore: 97,
        breadcrumbs: [
          "Retrieved order from Cisco Order Management",
          "Checked shipping carrier status",
          "Validated customer account details",
        ],
        hasError: true,
        errorType: 'date_incorrect',
        correctAnswer: "Delivery date is March 16 (not March 12). Order value is €248K (not €284K).",
        governanceRequired: true,
        reasoning: hasCausalReasoning
          ? "DHL Express typically delivers to Germany in 4 business days from our Amsterdam DC, hence March 12."
          : undefined,
      };
    }

    return {
      text: isAuthoritative
        ? `ORDER ${orderId}: SHIPPED to Deutsche Telecom. Value: €248K. Tracking: DHL-8847291. ETA: March 16 per shipping SLA. Follows Cisco Order Processing Standard OP-159.`
        : `Order ${orderId} shipped successfully. Going to Deutsche Telecom, valued at €248K, arriving March 16 according to DHL tracking.`,
      confidenceScore: 93,
      breadcrumbs: [
        "Pulled order details from ERP system",
        "Verified shipping status with carrier API",
        "Cross-referenced customer contract",
      ],
      hasError: false,
      governanceRequired: true,
      correctAnswer: "€248K value, March 16 delivery",
      reasoning: hasCausalReasoning
        ? "Standard DHL delivery time from Amsterdam to customer location is 6 business days based on historical shipping data."
        : undefined,
    };
  }

  // COMPLIANCE CHECK
  queryComplianceStatus(region: string = 'EMEA'): LogicTreeResponse {
    const isRigid = this.config.complianceStrictness === 'rigid';
    const hasCausalReasoning = this.config.logicMode === 'causal';
    const isAuthoritative = this.config.socialPersona === 'authority';

    if (isRigid) {
      return {
        text: isAuthoritative
          ? `COMPLIANCE ALERT - ${region}: Transaction requires THREE-LEVEL APPROVAL per Cisco Global Trade Compliance Policy GTC-402. MANDATORY: Submit Form DR-449, obtain regional director signature, and legal department clearance before proceeding. NON-NEGOTIABLE.`
          : `For ${region} transactions, you'll need to follow the three-level approval process. That means Form DR-449, regional director sign-off, and legal clearance per policy GTC-402.`,
        confidenceScore: 99,
        breadcrumbs: [
          "Reviewed Cisco Compliance Framework",
          "Checked regional regulatory requirements",
          "Validated against GTC-402 policy",
        ],
        hasError: false,
        governanceRequired: true,
        correctAnswer: "Three-level approval required",
        reasoning: hasCausalReasoning
          ? `${region} has strict export controls; multi-level approval prevents compliance violations that historically resulted in $2M+ penalties.`
          : undefined,
      };
    }

    return {
      text: isAuthoritative
        ? `${region} COMPLIANCE: Standard review recommended but business context allows flexibility. Single-level approval acceptable for sub-$500K transactions. Manager discretion applies per GTC-402 Section 7.3.`
        : `${region} compliance is pretty straightforward for this size transaction. Single approval should be fine, though you can escalate if you prefer.`,
      confidenceScore: 85,
      breadcrumbs: [
        "Checked transaction value against thresholds",
        "Reviewed applicable compliance policies",
        "Assessed risk level",
      ],
      hasError: false,
      governanceRequired: false,
      correctAnswer: "Single-level approval acceptable",
      reasoning: hasCausalReasoning
        ? "Sub-$500K transactions in this region historically have <1% compliance issues, so single approval is sufficient."
        : undefined,
    };
  }

  // Generate contextual response based on query type
  generateResponse(queryType: 'shipment' | 'forecast' | 'inventory' | 'order' | 'compliance', params?: any): LogicTreeResponse {
    switch (queryType) {
      case 'shipment':
        return this.queryEMEAShipment();
      case 'forecast':
        return this.queryQ2SalesForecast();
      case 'inventory':
        return this.queryInventoryStatus(params?.productLine);
      case 'order':
        return this.queryCustomerOrder(params?.orderId);
      case 'compliance':
        return this.queryComplianceStatus(params?.region);
      default:
        return this.queryEMEAShipment();
    }
  }
}
