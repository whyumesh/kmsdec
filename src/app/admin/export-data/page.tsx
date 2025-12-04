"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Download,
  RefreshCw,
  ArrowLeft,
  Users,
  Vote,
  UserCheck,
  BarChart3,
  FileText,
  TrendingUp
} from "lucide-react";

export const dynamic = 'force-dynamic'

interface ExportData {
  summary: {
    totalVoters: number;
    activeVoters: number;
    inactiveVoters: number;
    votersWithYuvaPankZone: number;
    votersWithKarobariZone: number;
    votersWithTrusteeZone: number;
    totalVotes: number;
    yuvaPankhVotes: number;
    karobariVotes: number;
    trusteeVotes: number;
    yuvaPankhTurnout: string;
    karobariTurnout: string;
    trusteeTurnout: string;
    yuvaPankhCandidates: { total: number; pending: number; approved: number; rejected: number };
    karobariCandidates: { total: number; pending: number; approved: number; rejected: number };
    trusteeCandidates: { total: number; pending: number; approved: number; rejected: number };
  };
  votersByRegion: Array<{
    region: string;
    total: number;
    yuvaPank: number;
    karobari: number;
    trustee: number;
  }>;
  yuvaPankhResults: Array<{
    zone: string;
    candidateName: string;
    votes: number;
  }>;
  karobariResults: Array<{
    zone: string;
    position: string;
    candidateName: string;
    votes: number;
  }>;
  trusteeResults: Array<{
    zone: string;
    candidateName: string;
    votes: number;
  }>;
  zoneTurnout: Array<{
    electionType: string;
    zoneName: string;
    totalVoters: number;
    votesCast: number;
    turnout: string;
    seats: number;
  }>;
  candidateStatus: Array<{
    electionType: string;
    zone: string;
    name: string;
    status: string;
    position: string;
    region: string;
    submitted: string;
  }>;
  votingData: Array<{
    voteId: string;
    voterId: string;
    electionType: string;
    electionTitle: string;
    timestamp: string;
    ipAddress: string;
  }>;
}

export default function ExportDataPage() {
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAdminAuth();
  const router = useRouter();
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && isAdmin && !authLoading) {
      fetchExportData();
    }
  }, [isAuthenticated, isAdmin, authLoading]);

  const fetchExportData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/admin/export-insights?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to fetch export data');
      }

      const result = await response.json();
      setExportData(result.data);
    } catch (err) {
      console.error('Error fetching export data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch export data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const downloadJSON = () => {
    if (!exportData) return;
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `election-insights-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    router.push('/admin/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Election Data Export</h1>
                <p className="text-sm text-gray-600">View and download election insights and statistics</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={fetchExportData}
                disabled={isRefreshing}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {exportData && (
                <Button onClick={downloadJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Download JSON
                </Button>
              )}
              <Link href="/admin/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading export data...</p>
          </div>
        ) : exportData ? (
          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="voters">Voters by Region</TabsTrigger>
              <TabsTrigger value="results">Election Results</TabsTrigger>
              <TabsTrigger value="turnout">Zone Turnout</TabsTrigger>
              <TabsTrigger value="candidates">Candidate Status</TabsTrigger>
              <TabsTrigger value="votes">Voting Data</TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Summary Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600">Total Voters</div>
                    <div className="text-2xl font-bold text-blue-900">{exportData.summary.totalVoters}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600">Active Voters</div>
                    <div className="text-2xl font-bold text-green-900">{exportData.summary.activeVoters}</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-purple-600">Total Votes</div>
                    <div className="text-2xl font-bold text-purple-900">{exportData.summary.totalVotes}</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="text-sm text-yellow-600">Yuva Pankh Turnout</div>
                    <div className="text-2xl font-bold text-yellow-900">{exportData.summary.yuvaPankhTurnout}</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600">Karobari Turnout</div>
                    <div className="text-2xl font-bold text-blue-900">{exportData.summary.karobariTurnout}</div>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <div className="text-sm text-indigo-600">Trustee Turnout</div>
                    <div className="text-2xl font-bold text-indigo-900">{exportData.summary.trusteeTurnout}</div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Yuva Pankh Candidates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <strong>{exportData.summary.yuvaPankhCandidates.total}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending:</span>
                        <Badge variant="outline">{exportData.summary.yuvaPankhCandidates.pending}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Approved:</span>
                        <Badge className="bg-green-500">{exportData.summary.yuvaPankhCandidates.approved}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Rejected:</span>
                        <Badge className="bg-red-500">{exportData.summary.yuvaPankhCandidates.rejected}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Karobari Candidates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <strong>{exportData.summary.karobariCandidates.total}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending:</span>
                        <Badge variant="outline">{exportData.summary.karobariCandidates.pending}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Approved:</span>
                        <Badge className="bg-green-500">{exportData.summary.karobariCandidates.approved}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Rejected:</span>
                        <Badge className="bg-red-500">{exportData.summary.karobariCandidates.rejected}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Trustee Candidates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <strong>{exportData.summary.trusteeCandidates.total}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending:</span>
                        <Badge variant="outline">{exportData.summary.trusteeCandidates.pending}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Approved:</span>
                        <Badge className="bg-green-500">{exportData.summary.trusteeCandidates.approved}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Rejected:</span>
                        <Badge className="bg-red-500">{exportData.summary.trusteeCandidates.rejected}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Voters by Region Tab */}
            <TabsContent value="voters">
              <Card>
                <CardHeader>
                  <CardTitle>Voters by Region</CardTitle>
                  <CardDescription>Distribution of voters across different regions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Voters</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yuva Pankh Zone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karobari Zone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trustee Zone</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exportData.votersByRegion.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.region}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.yuvaPank}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.karobari}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.trustee}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Election Results Tab */}
            <TabsContent value="results" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Yuva Pankh Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exportData.yuvaPankhResults
                          .sort((a, b) => b.votes - a.votes)
                          .map((result, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.zone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.candidateName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.votes}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Karobari Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exportData.karobariResults
                          .sort((a, b) => b.votes - a.votes)
                          .map((result, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.zone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.position}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.candidateName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.votes}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trustee Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exportData.trusteeResults
                          .sort((a, b) => b.votes - a.votes)
                          .map((result, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{result.zone}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.candidateName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.votes}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Zone Turnout Tab */}
            <TabsContent value="turnout">
              <Card>
                <CardHeader>
                  <CardTitle>Zone-wise Turnout</CardTitle>
                  <CardDescription>Voter turnout statistics by zone</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Voters</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes Cast</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnout</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exportData.zoneTurnout.map((zone, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{zone.electionType}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{zone.zoneName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.totalVoters}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.votesCast}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{zone.turnout}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{zone.seats}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Candidate Status Tab */}
            <TabsContent value="candidates">
              <Card>
                <CardHeader>
                  <CardTitle>Candidate Status</CardTitle>
                  <CardDescription>Status of all candidates across all election types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exportData.candidateStatus.map((candidate, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{candidate.electionType}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.zone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.position}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.region}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge
                                className={
                                  candidate.status === 'APPROVED' ? 'bg-green-500' :
                                  candidate.status === 'REJECTED' ? 'bg-red-500' :
                                  'bg-yellow-500'
                                }
                              >
                                {candidate.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.submitted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Voting Data Tab */}
            <TabsContent value="votes">
              <Card>
                <CardHeader>
                  <CardTitle>Voting Data</CardTitle>
                  <CardDescription>Recent voting activity (showing first 1000 votes)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vote ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voter ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exportData.votingData.map((vote, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vote.voteId.substring(0, 8)}...</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vote.voterId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vote.electionType}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vote.electionTitle}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(vote.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vote.ipAddress}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No export data available. Click Refresh to load data.</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}

